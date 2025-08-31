import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, Alert, Modal, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
//import NfcManager, { NfcTech, Ndef, NfcEvents } from 'react-native-nfc-manager';
//import { supabase } from './services/supabase'; // Importando o cliente Supabase
import Prontuario from './src/prontuário';
import Login from './src/login';
import Cadastro from './src/cadastro';
import ProntuarioScreen from './src/ProntuarioScreen';
import InputCRUD from './src/inputprontuario';
import CheckPoint from './src/checkpoint';
import { useUserContext } from './src/UserContext';
import { UserProvider } from './src/UserContext';
import PageGeral from './src/PaginaProntuarios';
import RegistrarVisitante from './src/RegistrarVisitante';
import MarcarCheckpoints from './src/MarcarCheckpoints';
import ControladorDashboard from './src/ControladorDashboard';
import OutrasFuncoes from './src/OutrasFuncoes';

const Stack = createNativeStackNavigator();

const App = () => {
    return (
        <UserProvider>
            <NavigationContainer>
                <Stack.Navigator>
                    <Stack.Screen 
                        name="Login" 
                        component={Login} 
                        options={{ headerShown: false }} // Oculta o cabeçalho
                    />
                    
                    <Stack.Screen 
                        name="CheckPoint" 
                        component={CheckPoint} 
                        options={{ headerShown: false }} // Oculta o cabeçalho
                    />
                    
                    <Stack.Screen 
                        name="PageGeral" 
                        component={PageGeral} 
                        options={{ headerShown: false }} // Oculta o cabeçalho
                    />
                    <Stack.Screen 
                        name="ProntuarioScreen" 
                        component={ProntuarioScreen} 
                        options={{ headerShown: false }} // Oculta o cabeçalho
                        //initialParams={{ id: null }} // Certifique-se de que não há navegação sem o ID
                    />
                    <Stack.Screen
                     name="Cadastro" 
                     component={Cadastro}
                     options={{ headerShown: false }} // Oculta o cabeçalho 
                    />
                    <Stack.Screen 
                        name="RegistrarVisitante" 
                        component={RegistrarVisitante} 
                        options={{ headerShown: false }} // Oculta o cabeçalho
                    />

                    <Stack.Screen 
                        name="MarcarCheckpoints" 
                        component={MarcarCheckpoints} 
                        options={{ headerShown: false }} // Oculta o cabeçalho
                    />
                    <Stack.Screen 
                        name="ControladorDashboard" 
                        component={ControladorDashboard} 
                        options={{ headerShown: false }} // Oculta o cabeçalho
                    />

                    <Stack.Screen 
                        name="OutrasFuncoes" 
                        component={OutrasFuncoes} 
                        options={{ headerShown: false }} // Oculta o cabeçalho
                    />


                </Stack.Navigator>
            </NavigationContainer>
        </UserProvider>
    );
};



/*
<UserProvider>
            <NavigationContainer>
                <Stack.Navigator>
                    {/*<Stack.Screen 
                        name="Login" 
                        component={Login} 
                        options={{ headerShown: false }} // Oculta o cabeçalho
                    />
                    
                    <Stack.Screen 
                        name="CheckPoint" 
                        component={CheckPoint} 
                        options={{ headerShown: false }} // Oculta o cabeçalho
                    />
                    
                    <Stack.Screen 
                        name="PageGeral" 
                        component={PageGeral} 
                        options={{ title: 'PageGeral' }} // Título para a tela de prontuário
                    />
                    <Stack.Screen 
                        name="ProntuarioScreen" 
                        component={ProntuarioScreen} 
                        options={{ title: 'ProntuárioScreen' }} // Título para a tela de prontuário
                        //initialParams={{ id: null }} // Certifique-se de que não há navegação sem o ID
                    />
                    {/*<Stack.Screen name="Cadastro" component={Cadastro} />
                    <Stack.Screen 
                        name="RegistrarVisitante" 
                        component={RegistrarVisitante} 
                        options={{ title: 'RegistrarVisitante' }} // Título para a tela de prontuário
                    />?
                </Stack.Navigator>
            </NavigationContainer>
        </UserProvider>
        */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#000000',
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        color: '#000000',
    },
    linkText: {
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#000000',
    },
    popupContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    popup: {
        width: 300,
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 10,
        alignItems: 'center',
    },
    popupText: {
        fontSize: 16,
        marginBottom: 20,
        color: '#000000',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: "black",    
    },
    input: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        marginBottom: 10,
        paddingHorizontal: 10,
        color: 'black',
    },
    subtitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
        color: 'black',
    },
    prontuarioItem: {
        marginBottom: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        color: 'black',
    },
    prontuarioText: {
        fontSize: 16,
    },
    mapButton: {
        color: 'green',
        marginTop: 5,
    },
    blackText: {
        color: 'black',
    },
});

export default App;
