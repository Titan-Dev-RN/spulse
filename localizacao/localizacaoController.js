import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, TouchableOpacity, ActivityIndicator, PermissionsAndroid, Platform, Modal, Linking } from 'react-native';
import NfcManager, { NfcTech, Ndef, NfcEvents } from 'react-native-nfc-manager';
import { useNavigation } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation'; // Importando a geolocalização
import { supabase } from '../services/supabase'; // Importando o cliente Supabase
import { WebView } from 'react-native-webview'; // Importando o WebView para exibir o mapa no Modal
import tw from 'tailwind-react-native-classnames';


const [mapUrl, setMapUrl] = useState({ latitude: null, longitude: null }); // URL para exibir o mapa
const [modalVisible, setModalVisible] = useState(false); // Estado para controlar a visibilidade do modal
const [currentLatitude, setCurrentLatitude] = useState('');
const [currentLongitude, setCurrentLongitude] = useState('');


const callLocation = () => {
        if (Platform.OS === 'ios') {
            getLocation();
        } else {
            const requestLocationPermission = async () => {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: "Permissão de Acesso à Localização",
                        message: "Este aplicativo precisa acessar sua localização",
                        buttonNeutral: "Pergunte-me depois",
                        buttonNegative: "Cancelar",
                        buttonPositive: "OK"
                    }
                );
                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    getLocation();
                } else {
                    Alert.alert('Permissão de Acesso negada');
                }
            };
            requestLocationPermission();
        }
    };
    
    const getLocation = () => {
        Geolocation.getCurrentPosition(
            (position) => {
                const currentLatitude = JSON.stringify(position.coords.latitude);
                const currentLongitude = JSON.stringify(position.coords.longitude);
                setCurrentLatitude(currentLatitude);
                setCurrentLongitude(currentLongitude);
            },
            (error) => {
                console.log(error);
                Alert.alert('Erro', 'Não foi possível obter a localização.');
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
        );
    };


    const openMap = (latitude, longitude) => {
        const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
        Linking.openURL(url)
            .catch(err => console.error('Erro ao abrir o Google Maps:', err));
    };
    
    const openMapModal = (latitude, longitude) => {
        setMapUrl({ latitude, longitude });
        setModalVisible(true); // Exibe o modal
    };


