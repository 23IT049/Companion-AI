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
            // Use fallback device list
            setDevices([
                {
                    device_type: 'Refrigerator',
                    brands: ['Samsung', 'LG', 'Whirlpool', 'GE'],
                    models: {},
                },
                {
                    device_type: 'Washing Machine',
                    brands: ['Samsung', 'LG', 'Whirlpool', 'Bosch'],
                    models: {},
                },
                {
                    device_type: 'Air Conditioner',
                    brands: ['Samsung', 'LG', 'Daikin', 'Carrier'],
                    models: {},
                },
                {
                    device_type: 'TV',
                    brands: ['Samsung', 'LG', 'Sony', 'TCL'],
                    models: {},
                },
                {
                    device_type: 'Dishwasher',
                    brands: ['Bosch', 'Whirlpool', 'Samsung', 'LG'],
                    models: {},
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
