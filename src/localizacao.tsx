import React, { useState, useEffect } from 'react';
import { PermissionsAndroid, Platform, Alert } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

const useLocation = () => {
    const [currentLatitude, setCurrentLatitude] = useState(null);
    const [currentLongitude, setCurrentLongitude] = useState(null);

    useEffect(() => {
        const getLocation = () => {
            Geolocation.getCurrentPosition(
                (position) => {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;
                    setCurrentLatitude(latitude);
                    setCurrentLongitude(longitude);
                },
                (error) => {
                    console.error('Erro ao obter a localização:', error);
                    Alert.alert('Erro', 'Não foi possível obter a localização.');
                },
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
            );
        };

        const requestLocationPermission = async () => {
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: 'Permissão de Acesso à Localização',
                        message: 'Este aplicativo precisa acessar sua localização.',
                        buttonNeutral: 'Pergunte-me depois',
                        buttonNegative: 'Cancelar',
                        buttonPositive: 'OK'
                    }
                );

                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    getLocation();
                } else {
                    Alert.alert('Permissão de Acesso negada');
                }
            } else {
                getLocation();
            }
        };

        requestLocationPermission();
    }, []);

    return { currentLatitude, currentLongitude };
};

export default useLocation;
