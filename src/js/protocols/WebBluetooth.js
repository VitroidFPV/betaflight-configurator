import { i18n } from "../localization";
import { gui_log } from "../gui_log";
import { bluetoothDevices } from "./devices";

/*  Certain flags needs to be enabled in the browser to use BT
 *
 *  app.commandLine.appendSwitch('enable-web-bluetooth', "true");
 *  app.commandLine.appendSwitch('disable-hid-blocklist')
 *  app.commandLine.appendSwitch('enable-experimental-web-platform-features');
 *
 */

class WebBluetooth extends EventTarget {
    constructor() {
        super();

        this.connected = false;
        this.openRequested = false;
        this.openCanceled = false;
        this.closeRequested = false;
        this.transmitting = false;
        this.connectionInfo = null;
        this.lastWrite = null;

        this.bitrate = 0;
        this.bytesSent = 0;
        this.bytesReceived = 0;
        this.failed = 0;

        this.portCounter = 0;
        this.devices = [];
        this.device = null;

        this.logHead = "[BLUETOOTH]";

        this.bluetooth = navigator?.bluetooth;

        this.bt11_crc_corruption_logged = false;

        if (!this.bluetooth) {
            console.error(`${this.logHead} Web Bluetooth API not supported`);
            return;
        }

        this.writeQueue = Promise.resolve();

        this.connect = this.connect.bind(this);

        this.bluetooth.addEventListener("connect", (e) => this.handleNewDevice(e.target));
        this.bluetooth.addEventListener("disconnect", (e) => this.handleRemovedDevice(e.target));
        this.bluetooth.addEventListener("gattserverdisconnected", (e) => this.handleRemovedDevice(e.target));

        this.loadDevices();
    }

    handleNewDevice(device) {
        const added = this.createPort(device);
        this.devices.push(added);
        this.dispatchEvent(new CustomEvent("addedDevice", { detail: added }));

        return added;
    }

    handleRemovedDevice(device) {
        const removed = this.devices.find((port) => port.port === device);
        this.devices = this.devices.filter((port) => port.port !== device);
        this.dispatchEvent(new CustomEvent("removedDevice", { detail: removed }));
    }

    handleReceiveBytes(info) {
        this.bytesReceived += info.detail.byteLength;
    }

    handleDisconnect() {
        this.disconnect();
        this.closeRequested = true;
    }

    getConnectedPort() {
        return this.device;
    }

    createPort(device) {
        return {
            path: `bluetooth_${this.portCounter++}`,
            displayName: device.name,
            vendorId: "unknown",
            productId: device.id,
            port: device,
        };
    }

    isBT11CorruptionPattern(expectedChecksum) {
        if (expectedChecksum !== 0xff || this.message_checksum === 0xff) {
            return false;
        }

        if (!this.connected) {
            return false;
        }

        const deviceDescription = this.deviceDescription;
        if (!deviceDescription) {
            return false;
        }

        return deviceDescription?.susceptibleToCrcCorruption ?? false;
    }

    shouldBypassCrc(expectedChecksum) {
        // Special handling for specific BT-11/CC2541 checksum corruption
        // Only apply workaround for known problematic devices
        const isBT11Device = this.isBT11CorruptionPattern(expectedChecksum);
        if (isBT11Device) {
            if (!this.bt11_crc_corruption_logged) {
                console.log(`${this.logHead} Detected BT-11/CC2541 CRC corruption (0xff), skipping CRC check`);
                this.bt11_crc_corruption_logged = true;
            }
            return true;
        }
        return false;
    }

    async loadDevices() {
        try {
            const devices = await this.getDevices();

            this.portCounter = 1;
            this.devices = devices.map((device) => this.createPort(device));
        } catch (error) {
            console.error(`${this.logHead} Failed to load devices:`, error);
        }
    }

    async requestPermissionDevice() {
        let newPermissionPort = null;

        const uuids = [];
        bluetoothDevices.forEach((device) => {
            uuids.push(device.serviceUuid);
        });

        const options = { acceptAllDevices: true, optionalServices: uuids };

        try {
            const userSelectedPort = await this.bluetooth.requestDevice(options);
            newPermissionPort = this.devices.find((port) => port.port === userSelectedPort);
            if (!newPermissionPort) {
                newPermissionPort = this.handleNewDevice(userSelectedPort);
            }
            console.info(`${this.logHead} User selected Bluetooth device from permissions:`, newPermissionPort.path);
        } catch (error) {
            console.error(`${this.logHead} User didn't select any Bluetooth device when requesting permission:`, error);
        }
        return newPermissionPort;
    }

    async getDevices() {
        return this.devices;
    }

    getAvailability() {
        this.bluetooth.getAvailability().then((available) => {
            console.log(`${this.logHead} Bluetooth available:`, available);
            this.available = available;
            return available;
        });
    }

    async connect(path, options) {
        this.openRequested = true;
        this.closeRequested = false;

        this.device = this.devices.find((device) => device.path === path).port;

        console.log(`${this.logHead} Opening connection with ID: ${path}, Baud: ${options.baudRate}`);

        this.device.addEventListener("gattserverdisconnected", this.handleDisconnect.bind(this));

        try {
            console.log(`${this.logHead} Connecting to GATT Server`);

            await this.gattConnect();

            gui_log(i18n.getMessage("bluetoothConnected", [this.device.name]));

            await this.getServices();
            await this.getCharacteristics();
            await this.startNotifications();
        } catch (error) {
            gui_log(i18n.getMessage("bluetoothConnectionError", [error]));
        }

        // Bluetooth API doesn't provide a way for getInfo() or similar to get the connection info
        const connectionInfo = this.device.gatt.connected;

        if (connectionInfo && !this.openCanceled) {
            this.connected = true;
            this.connectionId = path;
            this.bitrate = options.baudRate;
            this.bytesReceived = 0;
            this.bytesSent = 0;
            this.failed = 0;
            this.openRequested = false;

            this.device.addEventListener("disconnect", this.handleDisconnect.bind(this));
            this.addEventListener("receive", this.handleReceiveBytes);

            console.log(`${this.logHead} Connection opened with ID: ${this.connectionId}, Baud: ${options.baudRate}`);

            this.dispatchEvent(new CustomEvent("connect", { detail: connectionInfo }));
        } else if (connectionInfo && this.openCanceled) {
            this.connectionId = path;

            console.log(`${this.logHead} Connection opened with ID: ${path}, but request was canceled, disconnecting`);
            // some bluetooth dongles/dongle drivers really doesn't like to be closed instantly, adding a small delay
            setTimeout(() => {
                this.openRequested = false;
                this.openCanceled = false;
                this.disconnect(() => {
                    this.dispatchEvent(new CustomEvent("connect", { detail: false }));
                });
            }, 150);
        } else if (this.openCanceled) {
            console.log(`${this.logHead} Connection didn't open and request was canceled`);
            this.openRequested = false;
            this.openCanceled = false;
            this.dispatchEvent(new CustomEvent("connect", { detail: false }));
        } else {
            this.openRequested = false;
            console.log(`${this.logHead} Failed to open bluetooth port`);
            this.dispatchEvent(new CustomEvent("connect", { detail: false }));
        }
    }

    async gattConnect() {
        this.server = await this.device.gatt?.connect();
    }

    async getServices() {
        console.log(`${this.logHead} Get primary services`);

        this.services = await this.server.getPrimaryServices();

        this.service = this.services.find((service) => {
            this.deviceDescription = bluetoothDevices.find((device) => device.serviceUuid == service.uuid);
            return this.deviceDescription;
        });

        if (!this.deviceDescription) {
            throw new Error("Unsupported device");
        }

        gui_log(i18n.getMessage("bluetoothConnectionType", [this.deviceDescription.name]));

        console.log(`${this.logHead} Connected to service:`, this.service.uuid);

        return this.service;
    }

    async getCharacteristics() {
        const characteristics = await this.service.getCharacteristics();

        characteristics.forEach((characteristic) => {
            // console.log("Characteristic: ", characteristic);
            if (characteristic.uuid == this.deviceDescription.writeCharacteristic) {
                this.writeCharacteristic = characteristic;
            }

            if (characteristic.uuid == this.deviceDescription.readCharacteristic) {
                this.readCharacteristic = characteristic;
            }
            return this.writeCharacteristic && this.readCharacteristic;
        });

        if (!this.writeCharacteristic) {
            throw new Error(
                "Unexpected write characteristic found - should be",
                this.deviceDescription.writeCharacteristic,
            );
        }

        if (!this.readCharacteristic) {
            throw new Error(
                "Unexpected read characteristic found - should be",
                this.deviceDescription.readCharacteristic,
            );
        }

        this.readCharacteristic.addEventListener("characteristicvaluechanged", this.handleNotification.bind(this));
    }

    handleNotification(event) {
        // Create a proper Uint8Array directly from the DataView buffer
        const dataView = event.target.value;
        const buffer = new Uint8Array(
            dataView.buffer.slice(dataView.byteOffset, dataView.byteOffset + dataView.byteLength),
        );

        // Dispatch immediately instead of using setTimeout to avoid race conditions
        this.dispatchEvent(new CustomEvent("receive", { detail: buffer }));
    }

    startNotifications() {
        if (!this.readCharacteristic) {
            throw new Error("No read characteristic");
        }

        if (!this.readCharacteristic.properties.notify) {
            throw new Error("Read characteristic unable to notify.");
        }

        return this.readCharacteristic.startNotifications();
    }

    async disconnect() {
        this.connected = false;
        this.transmitting = false;
        this.bytesReceived = 0;
        this.bytesSent = 0;

        // if we are already closing, don't do it again
        if (this.closeRequested) {
            return;
        }

        const doCleanup = async () => {
            this.removeEventListener("receive", this.handleReceiveBytes);

            if (this.device) {
                this.device.removeEventListener("disconnect", this.handleDisconnect.bind(this));
                this.device.removeEventListener("gattserverdisconnected", this.handleDisconnect);
                this.readCharacteristic.removeEventListener(
                    "characteristicvaluechanged",
                    this.handleNotification.bind(this),
                );

                if (this.device.gatt.connected) {
                    this.device.gatt.disconnect();
                }

                this.writeCharacteristic = false;
                this.readCharacteristic = false;
                this.deviceDescription = false;
                this.device = null;
                this.bt11_crc_corruption_logged = false;
            }
        };

        try {
            await doCleanup();

            console.log(
                `${this.logHead} Connection with ID: ${this.connectionId} closed, Sent: ${this.bytesSent} bytes, Received: ${this.bytesReceived} bytes`,
            );

            this.connectionId = false;
            this.bitrate = 0;
            this.dispatchEvent(new CustomEvent("disconnect", { detail: true }));
        } catch (error) {
            console.error(error);
            console.error(
                `${this.logHead} Failed to close connection with ID: ${this.connectionId} closed, Sent: ${this.bytesSent} bytes, Received: ${this.bytesReceived} bytes`,
            );
            this.dispatchEvent(new CustomEvent("disconnect", { detail: false }));
        } finally {
            if (this.openCanceled) {
                this.openCanceled = false;
            }
        }
    }

    async send(data, cb) {
        if (!this.writeCharacteristic || typeof this.writeCharacteristic.writeValue !== "function") {
            if (cb) {
                cb({
                    error: "No write characteristic available or characteristic is invalid",
                    bytesSent: 0,
                });
            }
            console.error(`${this.logHead} No write characteristic available or characteristic is invalid`);
            return;
        }
        if (!this.device?.gatt?.connected) {
            if (cb) {
                cb({
                    error: "GATT Server is disconnected. Cannot perform GATT operations.",
                    bytesSent: 0,
                });
            }
            console.error(`${this.logHead} GATT Server is disconnected. Cannot perform GATT operations.`);
            return;
        }

        // There is no writable stream in the bluetooth API
        const dataBuffer = new Uint8Array(data);

        // Serialize writes to prevent concurrent access
        this.writeQueue = this.writeQueue
            .then(async () => {
                try {
                    await this.writeCharacteristic.writeValue(dataBuffer);
                    this.bytesSent += data.byteLength;

                    if (cb) {
                        cb({
                            error: null,
                            bytesSent: data.byteLength,
                        });
                    }
                } catch (e) {
                    console.error(`${this.logHead} Failed to send data:`, e);
                    if (cb) {
                        cb({
                            error: e,
                            bytesSent: 0,
                        });
                    }
                    throw e; // re-throw to keep the queue in a rejected state
                }
            })
            .catch(() => {
                // swallow here so queue chain continues on next write
            });

        await this.writeQueue;
    }
}

export default WebBluetooth;
