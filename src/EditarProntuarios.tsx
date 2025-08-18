import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, TouchableOpacity, ActivityIndicator, PermissionsAndroid, Platform, Modal, Linking } from 'react-native';
import { supabase } from '../services/supabase';
import { useUserContext } from './UserContext';



const [visitorData, setVisitorData] = useState({ name: '', gender: '', age: '', hours: '', user_id: '' });
    const [visitorList, setVisitorList] = useState([]);
    const [editingVisitor, setEditingVisitor] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedProntuario, setSelectedProntuario] = useState(null);
    const [currentLatitude, setCurrentLatitude] = useState(null);
    const [currentLongitude, setCurrentLongitude] = useState(null);
    const [contextCurrentUser, setContextCurrentUser] = useState(null); // Ajuste isso conforme necessário para o usuário logado

useEffect(() => {
    fetchVisitors();
}, []);

const handleInputChange = (field, value) => {
    setVisitorData({ ...visitorData, [field]: value });
};

export const fetchVisitors = async () => {
    try {
        const { data, error } = await supabase.from('visitors').select('*');
        if (error) {
            Alert.alert('Erro', 'Não foi possível buscar os registros de visitantes.');
            console.error('Erro ao buscar visitantes:', error);
            return [];
        } else {
            return data;
        }
    } catch (error) {
        console.error('Erro ao buscar visitantes:', error);
        return [];
    }
};

const saveEditProntuario = async () => {
    if (!editingVisitor) return;

    try {
        const { data, error } = await supabase
            .from('visitors')
            .update({
                name: visitorData.name,
                age: parseInt(visitorData.age),
                gender: visitorData.gender,
                hours: new Date().toLocaleTimeString(),
                date: new Date().toISOString().split('T')[0],
                latitude: currentLatitude,
                longitude: currentLongitude,
            })
            .eq('id', editingVisitor.id);

        if (error) {
            Alert.alert('Erro', 'Não foi possível editar o prontuário');
            console.error('Erro ao editar:', error);
        } else {
            Alert.alert('Sucesso', 'Prontuário editado com sucesso!');
            setEditingVisitor(null);
            fetchVisitors();
            setVisitorData({ name: '', age: '', gender: '' });
        }
    } catch (error) {
        console.error('Erro ao salvar edição:', error);
        Alert.alert('Erro', 'Ocorreu um erro ao tentar salvar a edição.');
    }
};

export const editProntuario = async (prontuarioId, updatedData) => {
    try {
        const { data, error } = await supabase.from('visitors').update(updatedData).eq('id', prontuarioId);
        if (error) {
            Alert.alert('Erro', 'Não foi possível editar o visitante');
            console.error('Erro ao editar:', error);
            return false;
        } else {
            Alert.alert('Sucesso', 'Visitante editado com sucesso!');
            return true;
        }
    } catch (error) {
        console.error('Erro ao editar prontuário:', error);
        return false;
    }
};


const editProntuarioInput = (visitor) => {
    setVisitorData({
        name: visitor.name,
        age: visitor.age.toString(),
        gender: visitor.gender,
    });
    setEditingVisitor(visitor);
};