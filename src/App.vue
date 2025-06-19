<script>
import CONFIGURATOR from "./js/data_storage.js";
import FC from "./js/fc.js";
import MSP from "./js/msp.js";
import PortHandler from "./js/port_handler.js";
import PortUsage from "/src/js/port_usage.js";

export default {
    data() {
        return {
            CONFIGURATOR,
            FC,
            MSP,
            PortHandler,
            PortUsage,
        };
    },
};
</script>

<template>
    <UApp>
        <div id="background"></div>
        <div id="side_menu_swipe"></div>
        <div class="headerbar">
            <div id="menu_btn">
                <em class="fas fa-bars"></em>
            </div>
            <BetaflightLogo
                :configurator-version="CONFIGURATOR.getDisplayVersion()"
                :firmware-version="FC.CONFIG.flightControllerVersion"
                :firmware-id="FC.CONFIG.flightControllerIdentifier"
                :hardware-id="FC.CONFIG.hardwareName"
            >
            </BetaflightLogo>
            <PortPicker
                v-model="PortHandler.portPicker"
                :connected-bluetooth-devices="PortHandler.currentBluetoothPorts"
                :connected-serial-devices="PortHandler.currentSerialPorts"
                :connected-usb-devices="PortHandler.currentUsbPorts"
                :show-virtual-option="PortHandler.showVirtualMode"
                :show-manual-option="PortHandler.showManualMode"
                :show-bluetooth-option="PortHandler.showBluetoothOption"
                :show-serial-option="PortHandler.showSerialOption"
                :show-usb-option="PortHandler.showUsbOption"
                :disabled="PortHandler.portPickerDisabled"
            ></PortPicker>
            <div class="header-wrapper">
                <div id="quad-status_wrapper">
                    <BatteryIcon
                        :voltage="FC.ANALOG.voltage"
                        :vbatmincellvoltage="FC.BATTERY_CONFIG.vbatmincellvoltage"
                        :vbatmaxcellvoltage="FC.BATTERY_CONFIG.vbatmaxcellvoltage"
                        :vbatwarningcellvoltage="FC.BATTERY_CONFIG.vbatwarningcellvoltage"
                        :batteryState="FC.BATTERY_STATE?.batteryState"
                    >
                    </BatteryIcon>
                    <BatteryLegend
                        :voltage="FC.ANALOG.voltage"
                        :vbatmaxcellvoltage="FC.BATTERY_CONFIG.vbatmaxcellvoltage"
                    >
                    </BatteryLegend>
                    <div class="bottomStatusIcons">
                        <div class="armedicon cf_tip" i18n_title="mainHelpArmed"></div>
                        <div class="failsafeicon cf_tip" i18n_title="mainHelpFailsafe"></div>
                        <div class="linkicon cf_tip" i18n_title="mainHelpLink"></div>
                    </div>
                </div>
                <div id="sensor-status" class="sensor_state mode-connected">
                    <ul>
                        <li class="gyro" i18n_title="sensorStatusGyro">
                            <div class="gyroicon" i18n="sensorStatusGyroShort"></div>
                        </li>
                        <li class="accel" i18n_title="sensorStatusAccel">
                            <div class="accicon" i18n="sensorStatusAccelShort"></div>
                        </li>
                        <li class="mag" i18n_title="sensorStatusMag">
                            <div class="magicon" i18n="sensorStatusMagShort"></div>
                        </li>
                        <li class="baro" i18n_title="sensorStatusBaro">
                            <div class="baroicon" i18n="sensorStatusBaroShort"></div>
                        </li>
                        <li class="gps" i18n_title="sensorStatusGPS">
                            <div class="gpsicon" i18n="sensorStatusGPSShort"></div>
                        </li>
                        <li class="sonar" i18n_title="sensorStatusSonar">
                            <div class="sonaricon" i18n="sensorStatusSonarShort"></div>
                        </li>
                    </ul>
                </div>
                <div id="dataflash_wrapper_global">
                    <div class="noflash_global" i18n="sensorDataFlashNotFound"></div>
                    <ul class="dataflash-contents_global">
                        <div class="legend" i18n="sensorDataFlashFreeSpace"></div>
                        <progress class="dataflash-progress_global" max="100"></progress>
                    </ul>
                    <div id="expertMode">
                        <label>
                            <input name="expertModeCheckbox" class="togglesmall" type="checkbox" />
                            <span i18n="expertMode" class="expertModeText"></span>
                        </label>
                    </div>
                </div>
            </div>
            <div id="header_buttons">
                <div class="firmware_flasher_button">
                    <a class="firmware_flasher_button__link disabled" href="#"></a>
                    <div class="firmware_flasher_button__label" i18n="flashTab"></div>
                </div>
                <div class="connection_button">
                    <a class="connection_button__link disabled" href="#"></a>
                    <div class="connection_button__label" i18n="connect"></div>
                </div>
            </div>
            <div id="reveal_btn">
                <em class="fas fa-ellipsis-v"></em>
            </div>
        </div>
        <div id="log">
            <div class="logswitch">
                <a href="#" id="showlog" i18n="logActionShow"></a>
            </div>
            <div id="scrollicon"></div>
            <div class="wrapper"></div>
        </div>
        <div id="tab-content-container">
            <div class="tab_container">
                <BetaflightLogo
                    :configurator-version="CONFIGURATOR.getDisplayVersion()"
                    :firmware-version="FC.CONFIG.flightControllerVersion"
                    :firmware-id="FC.CONFIG.flightControllerIdentifier"
                    :hardware-id="FC.CONFIG.hardwareName"
                >
                </BetaflightLogo>
                <div id="tabs">
                    <ul class="mode-disconnected">
                        <li class="tab_landing" id="tab_landing">
                            <a href="#" i18n="tabLanding" class="tabicon ic_welcome" i18n_title="tabLanding"></a>
                        </li>
                        <li class="tab_privacy_policy">
                            <a href="#" class="tabicon ic_help" i18n="tabPrivacyPolicy"></a>
                        </li>
                        <li class="tab_help" id="tab_help">
                            <a href="#" i18n="tabHelp" class="tabicon ic_help" i18n_title="tabHelp"></a>
                        </li>
                        <li class="tab_options" id="tab_options">
                            <a href="#" i18n="tabOptions" class="tabicon ic_config" i18n_title="tabOptions"></a>
                        </li>
                        <li class="tab_firmware_flasher" id="tabFirmware">
                            <a
                                href="#"
                                i18n="tabFirmwareFlasher"
                                class="tabicon ic_flasher"
                                i18n_title="tabFirmwareFlasher"
                            ></a>
                        </li>
                    </ul>
                    <ul class="mode-connected">
                        <li class="tab_setup">
                            <a href="#" i18n="tabSetup" class="tabicon ic_setup" i18n_title="tabSetup"></a>
                        </li>
                        <li class="tab_setup_osd">
                            <a href="#" i18n="tabSetupOSD" class="tabicon ic_setup" i18n_title="tabSetupOSD"></a>
                        </li>
                        <li class="tab_ports">
                            <a href="#" i18n="tabPorts" class="tabicon ic_ports" i18n_title="tabPorts"></a>
                        </li>
                        <li class="tab_configuration">
                            <a
                                href="#"
                                i18n="tabConfiguration"
                                class="tabicon ic_config"
                                i18n_title="tabConfiguration"
                            ></a>
                        </li>
                        <li class="tab_power">
                            <a href="#" i18n="tabPower" class="tabicon ic_power" i18n_title="tabPower"></a>
                        </li>
                        <li class="tab_failsafe">
                            <a href="#" i18n="tabFailsafe" class="tabicon ic_failsafe" i18n_title="tabFailsafe"></a>
                        </li>
                        <li class="tab_presets">
                            <a href="#" i18n="tabPresets" class="tabicon ic_wizzard" i18n_title="tabPresets"></a>
                        </li>
                        <li class="tab_pid_tuning">
                            <a href="#" i18n="tabPidTuning" class="tabicon ic_pid" i18n_title="tabPidTuning"></a>
                        </li>
                        <li class="tab_receiver">
                            <a href="#" i18n="tabReceiver" class="tabicon ic_rx" i18n_title="tabReceiver"></a>
                        </li>
                        <li class="tab_auxiliary">
                            <a href="#" i18n="tabAuxiliary" class="tabicon ic_modes" i18n_title="tabAuxiliary"></a>
                        </li>
                        <li class="tab_adjustments">
                            <a href="#" i18n="tabAdjustments" class="tabicon ic_adjust" i18n_title="tabAdjustments"></a>
                        </li>
                        <li class="tab_servos">
                            <a href="#" i18n="tabServos" class="tabicon ic_servo" i18n_title="tabServos"></a>
                        </li>
                        <li class="tab_gps">
                            <a href="#" i18n="tabGPS" class="tabicon ic_gps" i18n_title="tabGPS"></a>
                        </li>
                        <li class="tab_motors">
                            <a
                                href="#"
                                i18n="tabMotorTesting"
                                class="tabicon ic_motor"
                                i18n_title="tabMotorTesting"
                            ></a>
                        </li>
                        <li class="tab_osd">
                            <a href="#" i18n="tabOsd" class="tabicon ic_osd" i18n_title="tabOsd"></a>
                        </li>
                        <li class="tab_vtx">
                            <a href="#" i18n="tabVtx" class="tabicon ic_vtx" i18n_title="tabVtx"></a>
                        </li>
                        <li class="tab_transponder">
                            <a
                                href="#"
                                i18n="tabTransponder"
                                class="tabicon ic_transponder"
                                i18n_title="tabTransponder"
                            ></a>
                        </li>
                        <li class="tab_led_strip">
                            <a href="#" i18n="tabLedStrip" class="tabicon ic_led" i18n_title="tabLedStrip"></a>
                        </li>
                        <li class="tab_sensors">
                            <a
                                href="#"
                                i18n="tabRawSensorData"
                                class="tabicon ic_sensors"
                                i18n_title="tabRawSensorData"
                            ></a>
                        </li>
                        <li class="tab_logging">
                            <a href="#" i18n="tabLogging" class="tabicon ic_log" i18n_title="tabLogging"></a>
                        </li>
                        <li class="tab_onboard_logging">
                            <a
                                href="#"
                                i18n="tabOnboardLogging"
                                class="tabicon ic_data"
                                i18n_title="tabOnboardLogging"
                            ></a>
                        </li>
                        <!-- spare icons
                        <li class=""><a href="#"class="tabicon ic_mission">Mission (spare icon)</a></li>
                        <li class=""><a href="#"class="tabicon ic_advanced">Advanced (spare icon)</a></li>
                        <li class=""><a href="#"class="tabicon ic_wizzard">Wizzard (spare icon)</a></li>
                        -->
                    </ul>
                    <ul class="mode-connected mode-connected-cli">
                        <li class="tab_cli">
                            <a href="#" i18n="tabCLI" class="tabicon ic_cli" i18n_title="tabCLI"></a>
                        </li>
                    </ul>
                </div>
                <div class="clear-both"></div>
            </div>
            <div id="content"></div>
        </div>
        <status-bar
            :port-usage-down="PortUsage.port_usage_down"
            :port-usage-up="PortUsage.port_usage_up"
            :packet-error="MSP.packet_error"
            :i2c-error="FC.CONFIG.i2cError"
            :cycle-time="FC.CONFIG.cycleTime"
            :cpu-load="FC.CONFIG.cpuload"
            :configurator-version="CONFIGURATOR.getDisplayVersion()"
            :firmware-version="FC.CONFIG.flightControllerVersion"
            :firmware-id="FC.CONFIG.flightControllerIdentifier"
            :hardware-id="FC.CONFIG.hardwareName"
        ></status-bar>
        <div id="cache">
            <div class="data-loading">
                <p>Waiting for data ...</p>
            </div>
        </div>
    </UApp>
</template>
