import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, Linking } from 'react-native';
import { supabase } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import useLocation from './localizacao';
import tw from 'tailwind-react-native-classnames';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';

const RegistrarVisitante = () => {
  const [visitorData, setVisitorData] = useState({
    name: '',
    gender: '',
    age: '',
    telefone: '',
    pavilhao_destino: '',
  });
  const [photoUri, setPhotoUri] = useState(null);
  const [currentUserName, setCurrentUserName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [mapCoordinates, setMapCoordinates] = useState({ latitude: null, longitude: null });

  const { currentLatitude, currentLongitude } = useLocation();
  const navigation = useNavigation();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const email = await AsyncStorage.getItem('currentUser');
      if (email) {
        const { data } = await supabase
          .from('usersSpulse')
          .select('name')
          .eq('email', email)
          .single();
        if (data) setCurrentUserName(data.name);
      }
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
    }
  };

    
  const handlePickImage = () => {
    launchImageLibrary(
      { mediaType: 'photo', maxWidth: 800, maxHeight: 800, quality: 0.8 },
      (response) => {
        if (!response.didCancel && !response.errorCode && response.assets?.[0]?.uri) {
          setPhotoUri(response.assets[0].uri);
        }
      }
    );
  };

  const uploadImage = async (uri) => {
    const fileName = `visitor-${Date.now()}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images_visitors')
      .upload(fileName, { uri, type: 'image/jpeg' }, { upsert: true });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('images_visitors')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  };

  const saveVisitor = async () => {
    if (!visitorData.name || !visitorData.age || !visitorData.pavilhao_destino) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios');
      return;
    }
    if (!photoUri) {
      Alert.alert('Atenção', 'Adicione uma foto do visitante');
      return;
    }

    setLoading(true);
    try {
      const imageUrl = await uploadImage(photoUri);
      const currentDate = new Date();

      const { error } = await supabase.from('visitors').insert([{
        name: visitorData.name,
        gender: visitorData.gender,
        age: visitorData.age,
        telefone: visitorData.telefone,
        cpf: visitorData.cpf,
        rg: visitorData.rg,
        date: currentDate.toISOString().split('T')[0],
        hours: currentDate.toLocaleTimeString(),
        latitude: currentLatitude,
        longitude: currentLongitude,
        registered_by: currentUserName || 'Usuário',
        edited_by: currentUserName || 'Usuário',
        image_url: imageUrl,
      }]);

      if (error) throw error;

      Alert.alert('Sucesso', 'Visitante registrado com sucesso!');
      setVisitorData({ name: '', gender: '', age: '', telefone: '', pavilhao_destino: '' });
      setPhotoUri(null);
      navigation.navigate('PageGeral');
    } catch (error) {
      console.error('Erro ao salvar visitante:', error);
      Alert.alert('Erro', error.message || 'Falha ao registrar visitante');
    } finally {
      setLoading(false);
    }
  };

  const openMapModal = (lat, long) => {
    setMapCoordinates({ latitude: lat, longitude: long });
    setMapModalVisible(true);
  };

  const openMapsApp = () => {
    const { latitude, longitude } = mapCoordinates;
    if (latitude && longitude) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
    }
    setMapModalVisible(false);
  };

  return (
    <ScrollView contentContainerStyle={tw`flex-grow bg-gray-50 p-6`}>
      <Text style={tw`text-2xl font-bold text-center text-black mb-4`}>Cadastro de Visitante</Text>

      <View style={tw`bg-white rounded-xl shadow-sm p-6 mb-6`}>
        {/* Foto */}
        <View style={tw`items-center mb-6`}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={tw`w-40 h-40 rounded-lg mb-4`} />
          ) : (
            <View style={tw`w-40 h-40 bg-gray-100 rounded-lg justify-center items-center mb-4`}>
              <Icon name="camera" size={40} color="#9CA3AF" />
            </View>
          )}
          <TouchableOpacity
            onPress={handlePickImage}
            style={tw`bg-blue-600 rounded-lg px-4 py-2 flex-row items-center`}
          >
            <Icon name="image" size={18} color="white" style={tw`mr-2`} />
            <Text style={tw`text-white font-medium`}>{photoUri ? 'Alterar Foto' : 'Adicionar Foto'}</Text>
          </TouchableOpacity>
        </View>

        {/* Campos */}
        <View style={tw`space-y-4`}>
          <TextInput
            style={tw`border text-black border-gray-300  text-black rounded-lg px-4 py-3`}
            placeholder="Nome *"
            value={visitorData.name}
            onChangeText={(text) => setVisitorData({ ...visitorData, name: text })}
          />
          <TextInput
            style={tw`border border-gray-300  text-black rounded-lg px-4 py-3`}
            placeholder="Idade *"
            keyboardType="numeric"
            value={visitorData.age}
            onChangeText={(text) => setVisitorData({ ...visitorData, age: text })}
          />
          <TextInput
            style={tw`border border-gray-300  text-black rounded-lg px-4 py-3`}
            placeholder="Gênero"
            value={visitorData.gender}
            onChangeText={(text) => setVisitorData({ ...visitorData, gender: text })}
          />
          <TextInput
            style={tw`border border-gray-300 text-gray-800 rounded-lg px-4 py-3`}
            placeholder="Telefone"
            keyboardType="phone-pad"
            value={visitorData.telefone}
            onChangeText={(text) => setVisitorData({ ...visitorData, telefone: text })}
          />
          <TextInput
            style={tw`border border-gray-300 text-black rounded-lg px-4 py-3`}
            placeholder="CPF *"
            value={visitorData.cpf}
            onChangeText={(text) => setVisitorData({ ...visitorData, cpf: text })}
          />
          <TextInput
            style={tw`border border-gray-300 text-black rounded-lg px-4 py-3`}
            placeholder="RG *"
            value={visitorData.rh}
            onChangeText={(text) => setVisitorData({ ...visitorData, rg: text })}
          />
        </View>

        {/* Botões */}
        {currentLatitude && currentLongitude && (
          <TouchableOpacity
            onPress={() => openMapModal(currentLatitude, currentLongitude)}
            style={tw`mt-4 border border-blue-500 rounded-lg p-3 flex-row items-center justify-center`}
          >
            <Icon name="location" size={18} color="#3B82F6" style={tw`mr-2`} />
            <Text style={tw`text-blue-600 font-medium`}>Ver Localização Atual</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={saveVisitor}
          disabled={loading}
          style={tw`mt-6 bg-green-600 rounded-lg p-4 ${loading ? 'opacity-70' : ''}`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={tw`text-white font-bold text-lg text-center`}>Salvar Visitante</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('PageGeral')}
          style={tw`mt-4 bg-gray-200 rounded-lg p-4`}
        >
          <Text style={tw`text-gray-800 font-medium text-center`}>Voltar</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Mapa */}
      <Modal visible={mapModalVisible} transparent animationType="fade">
        <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}>
          <View style={tw`bg-white rounded-xl p-6 w-5/6`}>
            <Text style={tw`text-lg font-bold text-gray-800 mb-4 text-center`}>Abrir no Mapa</Text>
            <Text style={tw`text-gray-600 mb-6 text-center`}>
              Deseja visualizar esta localização no aplicativo de mapas?
            </Text>
            <View style={tw`flex-row justify-between`}>
              <TouchableOpacity
                onPress={() => setMapModalVisible(false)}
                style={tw`bg-gray-200 rounded-lg px-6 py-3 flex-1 mr-2`}
              >
                <Text style={tw`text-gray-800 font-medium text-center`}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openMapsApp}
                style={tw`bg-blue-600 rounded-lg px-6 py-3 flex-1 ml-2`}
              >
                <Text style={tw`text-white font-medium text-center`}>Abrir Mapa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default RegistrarVisitante;
