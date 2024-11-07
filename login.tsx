import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from './services/supabase'; // Importando o cliente Supabase
import { useUserContext } from './UserContext'; // Importando o contexto corretamente
//import { checkpoint } from './checkpoint'; //Importando a página do CheckPoint

const Login = () => {
    const [email, setEmail] = useState(''); 
    const [password, setPassword] = useState('');
    const navigation = useNavigation(); 
    const { loginUser } = useUserContext(); // Usar o loginUser do contexto

    const handleLogin = async () => {
        if (email && password) {
            // Verifica se o email existe
            const { data: emailData, error: emailError } = await supabase
                .from('usersSpulse')
                .select('*')
                .eq('email', email);
    
            if (emailError || !emailData || emailData.length === 0) {
                Alert.alert('Erro', 'Email não encontrado');
            } else {
                // Verifica se a senha corresponde ao email fornecido
                const { data: senhaData, error: senhaError } = await supabase
                    .from('usersSpulse')
                    .select('*')
                    .eq('email', email)
                    .eq('senha', password); // Mudança para "senha"
    
                if (senhaError || !senhaData || senhaData.length === 0) {
                    Alert.alert('Erro', 'Senha incorreta');
                } else {
                    Alert.alert('Sucesso', 'Login realizado com sucesso!');
                    await loginUser(email); // Armazena o usuário no contexto
                    navigation.navigate('CheckPoint'); // Redireciona para a tela de checkpoint
                }
            }
        } else {
            Alert.alert('Erro', 'Por favor, preencha todos os campos.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>
            <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#888888"
                value={email}
                onChangeText={setEmail}
            />
            <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor="#888888"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />
            <Button title="Entrar" onPress={handleLogin} />
            <Text style={styles.registerText}>
                Não tem uma conta?{' '}
                <TouchableOpacity onPress={() => navigation.navigate('Cadastro')}>
                    <Text style={styles.link}>Registre-se aqui</Text>
                </TouchableOpacity>
            </Text>
        </View>
    );
};

// Estilos do componente
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

export default Login;
