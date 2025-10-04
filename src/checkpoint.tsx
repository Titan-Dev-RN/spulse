import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import tw from 'tailwind-react-native-classnames';
import useLocation from './localizacao';

const CheckPoint = () => {
  const navigation = useNavigation();
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserName, setCurrentUserName] = useState(null);
  const [userId, setUserId] = useState(null);

  const [pavilions, setPavilions] = useState([]);
  const [selectedPavilion, setSelectedPavilion] = useState(null);
  const [loading, setLoading] = useState(false);
  const { currentLatitude, currentLongitude } = useLocation();


  const year = new Date().getFullYear();

  // Busca usuário logado
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const email = await AsyncStorage.getItem('currentUser');
        if (!email) return;

        setCurrentUser(email);

        const { data, error } = await supabase
          .from('usersSpulse')
          .select('id, name')
          .eq('email', email)
          .single();

        if (error || !data) {
          console.warn('Erro ao buscar usuário:', error);
          return;
        }

        setCurrentUserName(data.name);
        setUserId(data.id);
      } catch (error) {
        console.error('Erro ao buscar usuário atual:', error);
      }
    };

    fetchCurrentUser();
    fetchPavilions();
  }, []);

  // Busca lista de pavilhões
  const fetchPavilions = async () => {
    try {
      const { data, error } = await supabase
        .from('pavilions')
        .select('*');
      if (error) throw error;
      setPavilions(data || []);
    } catch (error) {
      console.error('Erro ao buscar pavilhões:', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista de pavilhões');
    }
  };

  // Salvar checkpoint
  const handleSaveCheckpoint = async () => {
    if (!selectedPavilion) {
      Alert.alert('Erro', 'Selecione um pavilhão antes de registrar o checkpoint.');
      return;
    }

    try {
      setLoading(true);

      const date = new Date().toISOString().split('T')[0]; // apenas data
      const time = new Date().toLocaleTimeString('pt-BR', { hour12: false });



      const { error } = await supabase
        .from('agent_checkpoints')
        .upsert([{
            user_id: userId,
            user_email: currentUser,
            pavilion_id: selectedPavilion.id,
            date,
            hours: time,
            latitude: currentLatitude,
            longitude: currentLongitude,
            active: true
        }], { onConflict: ['user_id', 'pavilion_id', 'date'] });


      if (error) throw error;

      Alert.alert('Sucesso', 'Checkpoint registrado com sucesso!');
      setSelectedPavilion(null);
      navigation.navigate('PageGeral');
    } catch (error) {
      console.error('Erro ao salvar checkpoint:', error);
      Alert.alert('Erro', 'Não foi possível salvar o checkpoint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={tw`flex-1 bg-gray-100 p-6`}>
      <Text style={tw`text-3xl font-extrabold text-center text-blue-600 mb-10`}>
        Checkpoint do Agente
      </Text>

      {currentUser && (
        <View style={tw`bg-gray-100 rounded-lg p-4 mb-6 shadow`}>
          <Text style={tw`text-base text-gray-700`}>Usuário: <Text style={tw`font-bold text-black`}>{currentUserName}</Text></Text>
          <Text style={tw`text-base text-gray-700`}>Email: <Text style={tw`font-bold text-black`}>{currentUser}</Text></Text>
        </View>
      )}

      <View style={tw`mb-6`}>
        <Text style={tw`text-lg font-semibold text-gray-700 mb-2`}>Selecione o Pavilhão</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`flex-row mb-2`}>
          {pavilions.map(p => (
            <TouchableOpacity
              key={p.id}
              onPress={() => setSelectedPavilion(p)}
              style={tw`p-4 mr-2 rounded-lg border ${selectedPavilion?.id === p.id ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'}`}
            >
              <Text style={tw`${selectedPavilion?.id === p.id ? 'text-green-700 font-semibold' : 'text-gray-700'}`}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity
        onPress={handleSaveCheckpoint}
        style={tw`bg-blue-500 rounded-lg p-4 mb-6 shadow-lg ${loading ? 'opacity-70' : ''}`}
        disabled={loading}
      >
        <Text style={tw`text-white text-center font-bold text-lg`}>
          {loading ? 'Registrando...' : 'Salvar Checkpoint'}
        </Text>
      </TouchableOpacity>

      <View style={tw`mt-6 items-center`}>
        <Text style={tw`text-gray-400 text-sm`}>Versão 1.0.0</Text>
        <Text style={tw`text-gray-400 text-xs`}>© {year} Sistema Spulse</Text>
      </View>
    </View>
  );
};

export default CheckPoint;
