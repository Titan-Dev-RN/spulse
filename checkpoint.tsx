import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './services/supabase'; // Importando o cliente Supabase
import { useUserContext } from './UserContext'; // Importando o contexto de usuário

const CheckPoint = () => {
    const [visitorData, setVisitorData] = useState({
        pavilion: '',
        hours: new Date().toLocaleTimeString(),
        date: new Date().toISOString().split('T')[0],
    });

    const [currentUser, setCurrentUser] = useState(null);
    const navigation = useNavigation(); 
    const { loginUser } = useUserContext(); // Usar o loginUser do contexto

    useEffect(() => {
        const loadData = async () => {
            await fetchCurrentUser();
        };
        loadData();
    }, []);
    
    const fetchCurrentUser = async () => {
        try {
            const email = await AsyncStorage.getItem('currentUser');
            if (email) {
                setCurrentUser(email);
            } else {
                console.warn('Nenhum usuário logado encontrado.');
            }
        } catch (error) {
            console.error('Erro ao buscar usuário atual:', error);
        }
    };

    const handleInputChange = (field, value) => {
        setVisitorData({ ...visitorData, [field]: value });
    };

    const handleSaveVisitor = async () => {
        if (visitorData.pavilion) {
            const { data, error } = await supabase
                .from('checkpoints')
                .insert([{
                    user_email: currentUser,
                    pavilion: visitorData.pavilion,
                    hours: visitorData.hours,
                    date: visitorData.date,
                    // latitude: currentLatitude,
                    // longitude: currentLongitude,
                }]);

            if (error) {
                Alert.alert('Erro', 'Não foi possível salvar o registro de visitante');
                console.error('Erro ao salvar:', error);
            } else {
                Alert.alert('Sucesso', 'Visitante salvo com sucesso!');
                navigation.navigate('Prontuario'); // Redireciona para a tela de checkpoint
            }
        } else {
            Alert.alert('Erro', 'Por favor, preencha o campo de pavilhão.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Checkpoint de Visitantes</Text>
            
            {currentUser && <Text style={styles.userInfo}>Usuário Logado: {currentUser}</Text>}
            
            <TextInput
                style={styles.input}
                placeholder="Pavilhão"
                placeholderTextColor="#888888"
                value={visitorData.pavilion}
                onChangeText={(text) => handleInputChange('pavilion', text)}
            />
            
            <Button title="Salvar Registro" onPress={handleSaveVisitor} />

            <Text style={styles.registerText}>
                Não tem uma conta?{' '}
                <TouchableOpacity onPress={() => navigation.navigate('Cadastro')}>
                    <Text style={styles.link}>Registre-se aqui</Text>
                </TouchableOpacity>
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 16,
        backgroundColor: '#f4f4f4',
    },
    title: {
        fontSize: 24,
        textAlign: 'center',
        marginBottom: 20,
        color: 'black',
    },
    userInfo: {
        fontSize: 18,
        marginBottom: 20,
        textAlign: 'center',
        color: 'black',
    },
    input: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 4,
        marginBottom: 15,
        paddingHorizontal: 10,
        color: 'black',
    },
    registerText: {
        textAlign: 'center',
        marginTop: 20,
        color: 'black',
    },
    link: {
        color: '#007bff',
    },
});

export default CheckPoint;
