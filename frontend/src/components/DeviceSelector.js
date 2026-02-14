import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import './DeviceSelector.css';
import { devicesAPI } from '../services/api';

const DeviceSelector = ({
    deviceType,
    brand,
    model,
    onDeviceTypeChange,
    onBrandChange,
    onModelChange,
}) => {
    const [devices, setDevices] = useState([]);
    const [availableBrands, setAvailableBrands] = useState([]);
    const [availableModels, setAvailableModels] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDevices();
    }, []);

    useEffect(() => {
        if (deviceType) {
            const selectedDevice = devices.find((d) => d.device_type === deviceType);
            if (selectedDevice) {
                setAvailableBrands(selectedDevice.brands || []);
                onBrandChange('');
                onModelChange('');
            }
        } else {
            setAvailableBrands([]);
            setAvailableModels([]);
        }
    }, [deviceType, devices]);

    useEffect(() => {
        if (brand && deviceType) {
            const selectedDevice = devices.find((d) => d.device_type === deviceType);
            if (selectedDevice && selectedDevice.models) {
                setAvailableModels(selectedDevice.models[brand] || []);
                onModelChange('');
            }
        } else {
            setAvailableModels([]);
        }
    }, [brand, deviceType, devices]);

    const loadDevices = async () => {
        try {
            const response = await devicesAPI.listDevices();
            setDevices(response.devices || []);
        } catch (error) {
            console.error('Error loading devices:', error);
            // Use fallback device list with sample models
            setDevices([
                {
                    device_type: 'Refrigerator',
                    brands: ['Samsung', 'LG', 'Whirlpool', 'GE'],
                    models: {
                        'Samsung': ['RF28R7351SR', 'RF23M8070SR', 'RT18M6215SG', 'RB29FWRNDSA'],
                        'LG': ['LRFLC2706S', 'LFXS26973S', 'LMXS30776S', 'LRFVC2406S'],
                        'Whirlpool': ['WRF535SWHZ', 'WRS325SDHZ', 'WRT318FZDW', 'WRB322DMBM'],
                        'GE': ['GNE27JSMSS', 'GYE22GYNFS', 'GTS18GTHWW', 'GIE18GTHBB']
                    },
                },
                {
                    device_type: 'Washing Machine',
                    brands: ['Samsung', 'LG', 'Whirlpool', 'Bosch'],
                    models: {
                        'Samsung': ['WF45R6100AP', 'WF42H5000AW', 'WA50R5400AV', 'WF45K6500AV'],
                        'LG': ['WM3900HWA', 'WM4000HWA', 'WT7300CW', 'WM9000HVA'],
                        'Whirlpool': ['WFW5620HW', 'WTW5000DW', 'WFW9620HW', 'WTW8127LW'],
                        'Bosch': ['WAT28400UC', 'WAW285H2UC', 'WAW285H1UC', 'WAT28401UC']
                    },
                },
                {
                    device_type: 'Air Conditioner',
                    brands: ['Samsung', 'LG', 'Daikin', 'Carrier'],
                    models: {
                        'Samsung': ['AR12TXHQASINEU', 'AR09TXHQASINEU', 'AR18TSHQASINEU', 'AR24TXHQASINEU'],
                        'LG': ['S4-W12JA3AA', 'S4-W18KLJWA', 'S3-M12JA3FA', 'S4-W24JA3AA'],
                        'Daikin': ['FTKM50TV16U', 'FTKM35TV16U', 'FTKM25TV16U', 'FTKM60TV16U'],
                        'Carrier': ['CAI12EK3R39F0', 'CAI18EK5R39F0', 'CAI24EK5R39F0', 'CAI12EK5R39F0']
                    },
                },
                {
                    device_type: 'TV',
                    brands: ['Samsung', 'LG', 'Sony', 'TCL'],
                    models: {
                        'Samsung': ['QN90A', 'QN85A', 'AU8000', 'Q60A', 'The Frame'],
                        'LG': ['C1 OLED', 'G1 OLED', 'A1 OLED', 'QNED90', 'NanoCell 90'],
                        'Sony': ['A90J OLED', 'X95J', 'X90J', 'X85J', 'A80J OLED'],
                        'TCL': ['6-Series R635', '5-Series S535', '4-Series S435', '6-Series R646']
                    },
                },
                {
                    device_type: 'Dishwasher',
                    brands: ['Bosch', 'Whirlpool', 'Samsung', 'LG'],
                    models: {
                        'Bosch': ['SHPM88Z75N', 'SHEM63W55N', 'SHP865WD5N', 'SHPM78Z54N'],
                        'Whirlpool': ['WDT750SAKZ', 'WDF520PADM', 'WDT730PAHZ', 'WDTA50SAKZ'],
                        'Samsung': ['DW80R9950US', 'DW80R5061US', 'DW80K5050US', 'DW80R2031US'],
                        'LG': ['LDP6797ST', 'LDT7808SS', 'LDF5545ST', 'LDTH7972S']
                    },
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="device-selector-loading">Loading devices...</div>;
    }

    return (
        <div className="device-selector">
            <div className="selector-group">
                <label htmlFor="device-type">Device Type</label>
                <div className="select-wrapper">
                    <select
                        id="device-type"
                        value={deviceType}
                        onChange={(e) => onDeviceTypeChange(e.target.value)}
                    >
                        <option value="">Select device type...</option>
                        {devices.map((device) => (
                            <option key={device.device_type} value={device.device_type}>
                                {device.device_type}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="select-icon" size={16} />
                </div>
            </div>

            <div className="selector-group">
                <label htmlFor="brand">Brand (Optional)</label>
                <div className="select-wrapper">
                    <select
                        id="brand"
                        value={brand}
                        onChange={(e) => onBrandChange(e.target.value)}
                        disabled={!deviceType || availableBrands.length === 0}
                    >
                        <option value="">Select brand...</option>
                        {availableBrands.map((b) => (
                            <option key={b} value={b}>
                                {b}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="select-icon" size={16} />
                </div>
            </div>

            <div className="selector-group">
                <label htmlFor="model">Model (Optional)</label>
                <div className="select-wrapper">
                    <select
                        id="model"
                        value={model}
                        onChange={(e) => onModelChange(e.target.value)}
                        disabled={!brand || availableModels.length === 0}
                    >
                        <option value="">Select model...</option>
                        {availableModels.map((m) => (
                            <option key={m} value={m}>
                                {m}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="select-icon" size={16} />
                </div>
            </div>
        </div>
    );
};

export default DeviceSelector;
