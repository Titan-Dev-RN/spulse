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
import CheckPoint from './src/checkpoint';
import { useUserContext } from './src/UserContext';
import { UserProvider } from './src/UserContext';
import PageGeral from './src/PaginaProntuarios';
import RegistrarVisitante from './src/RegistrarVisitante';
import MarcarCheckpoints from './src/MarcarCheckpoints';
import ControladorDashboard from './src/ControladorDashboard';
import OutrasFuncoes from './src/OutrasFuncoes';
import AdminPainel from './src/AdminPainel';
import Agendamento from './src/Agendamento';
import GerenciarRotas from './src/ControlarRotas';
import VisitasAgendadas from './src/VisitasAgendadas';

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
                     name="GerenciarRotas" 
                     component={GerenciarRotas}
                     options={{ headerShown: false }} // Oculta o cabeçalho 
                    />

                    <Stack.Screen 
                        name="RegistrarVisitante" 
                        component={RegistrarVisitante} 
                        options={{ headerShown: false }} // Oculta o cabeçalho
                    />

                    <Stack.Screen 
                        name="Agendamento" 
                        component={Agendamento} 
                        options={{ headerShown: false }} // Oculta o cabeçalho
                    />

                    <Stack.Screen 
                        name="AdminPainel" 
                        component={AdminPainel} 
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

                    <Stack.Screen 
                        name="VisitasAgendadas" 
                        component={VisitasAgendadas} 
                        options={{ headerShown: false }} // Oculta o cabeçalho
                    />


                </Stack.Navigator>
            </NavigationContainer>
        </UserProvider>
    );
};


export default App;
