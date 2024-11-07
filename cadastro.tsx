import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from './services/supabase'; // Certifique-se de que o cliente Supabase está configurado corretamente

const CadastroSpulse = () => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [cpf, setCpf] = useState('');
    const navigation = useNavigation();

    const handleCadastro = async () => {
        if (email && password && name && cpf) {
            try {
                // Insere o usuário no banco de dados Spulse (tabela usersSpulse)
                const { data, error } = await supabase
                    .from('usersSpulse')
                    .insert([{ name, email, senha: password, cpf }]);

                if (error) {
                    Alert.alert('Erro', error.message || 'Falha ao salvar o cadastro.');
                    console.error('Erro ao salvar:', error);
                } else {
                    Alert.alert('Sucesso', 'Cadastro realizado com sucesso!');
                    setName('');
                    setEmail('');
                    setPassword('');
                    setCpf('');
                    navigation.navigate('Login');
                }
            } catch (ex) {
                console.error('Erro durante o cadastro:', ex);
                Alert.alert('Erro', 'Ocorreu um erro durante o cadastro.');
            }
        } else {
            Alert.alert('Erro', 'Por favor, preencha todos os campos.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Cadastro Spulse</Text>
            <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#888888"
                value={email}
                onChangeText={setEmail}
            />
            <TextInput
                style={styles.input}
                placeholder="Nome"
                placeholderTextColor="#888888"
                value={name}
                onChangeText={setName}
            />
            <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor="#888888"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />
            <TextInput
                style={styles.input}
                placeholder="CPF"
                placeholderTextColor="#888888"
                value={cpf}
                onChangeText={setCpf}
            />
            <Button title="Cadastre-se" onPress={handleCadastro} />
            <Text style={styles.registerText}>
                Já tem uma conta?{' '}
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.link}>Faça o Login aqui</Text>
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

export default CadastroSpulse;
