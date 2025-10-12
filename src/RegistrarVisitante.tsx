import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, Linking } from 'react-native';
import { supabase } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import useLocation from './localizacao';
import tw from 'tailwind-react-native-classnames';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { Picker } from '@react-native-picker/picker';
import { PermissionsAndroid, Platform } from 'react-native';
// filepath: c:\Users\Windows\Documents\Spulse\src\RegistrarVisitante.tsx

const RegistrarVisitante = () => {
  const [visitorData, setVisitorData] = useState({
    name: '',
    gender: '',
    age: '',
    telefone: '',
    rg: '',
    cpf: '',
  });
  const [photoUri, setPhotoUri] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [mapCoordinates, setMapCoordinates] = useState({ latitude: null, longitude: null });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [photoBase64, setPhotoBase64] = useState(null);

  const { currentLatitude, currentLongitude } = useLocation();
  const navigation = useNavigation();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const email = await AsyncStorage.getItem('currentUser');
      if (email) {
        const { data, error } = await supabase
          .from('usersSpulse')
          .select('id, name, email')
          .eq('email', email)
          .single();
        
        if (error) throw error;
        if (data) setCurrentUser(data);
      }
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
    }
  };

  // Solicitar permissões de armazenamento no Android
  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        // Para Android 10+ (API 29), permissões de leitura podem não ser necessárias
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: "Permissão de Armazenamento",
            message: "O app precisa acessar o armazenamento para fazer upload de imagens.",
            buttonPositive: "OK",
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const handlePickImage = async () => {
    

    launchImageLibrary(
      { 
        mediaType: 'photo', 
        maxWidth: 800, 
        maxHeight: 800, 
        quality: 0.7,
        includeBase64: true // <-- altere aqui
      },
      (response) => {
        if (!response.didCancel && !response.errorCode && response.assets?.[0]?.uri) {
          setPhotoUri(response.assets[0].uri);
          setPhotoBase64(response.assets[0].base64); // salve o base64
        } else if (response.errorCode) {
          console.error('Erro na seleção de imagem:', response.errorMessage);
          Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
        }
      }
    );
  };

  const uploadImage = async (base64) => {
    try {
      const fileName = `visitor-${Date.now()}.jpg`;
      // Converte base64 para array de bytes
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images_visitors')
        .upload(fileName, byteArray, {
          contentType: 'image/jpeg',
          upsert: false
        });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('images_visitors')
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Erro no upload da imagem:', error);
      throw error;
    }
  };

  // Função alternativa sem imagem
  const saveVisitorWithoutImage = async () => {
    if (!visitorData.name || !visitorData.age || !visitorData.cpf || !visitorData.rg) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios');
      return;
    }
    if (!currentUser) {
      Alert.alert('Erro', 'Usuário não identificado');
      return;
    }

    setLoading(true);
    try {
      const visitorToInsert = {
        name: visitorData.name,
        gender: visitorData.gender,
        age: visitorData.age,
        telefone: visitorData.telefone,
        cpf: visitorData.cpf,
        rg: visitorData.rg,
        latitude: currentLatitude,
        longitude: currentLongitude,
        user_id: currentUser.id,
        registered_by: currentUser.name || 'Usuário',
        image_url: null, // Sem imagem
        created_at: new Date().toISOString(),
      };

      console.log('Inserindo visitante sem imagem...');

      const { data, error } = await supabase
        .from('visitors')
        .insert([visitorToInsert])
        .select();

      if (error) throw error;

      Alert.alert('Sucesso', 'Visitante registrado sem foto!');
      
      setVisitorData({
        name: '',
        gender: '',
        age: '',
        telefone: '',
        rg: '',
        cpf: '',
      });
      setPhotoUri(null);
      
      navigation.navigate('PageGeral');
      
    } catch (error) {
      console.error('Erro ao salvar visitante:', error);
      Alert.alert('Erro', error.message || 'Falha ao registrar visitante');
    } finally {
      setLoading(false);
    }
  };

  const saveVisitor = async () => {
    if (!visitorData.name || !visitorData.age || !visitorData.cpf || !visitorData.rg) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios');
      return;
    }
    if (!currentUser) {
      Alert.alert('Erro', 'Usuário não identificado');
      return;
    }

    setLoading(true);
    
    try {
      let imageUrl = null;
      
      // Tentar upload apenas se houver foto
      if (photoBase64) {
        try {
          imageUrl = await uploadImage(photoBase64);
        } catch (uploadError) {
          console.error('Erro no upload, oferecendo opção sem imagem:', uploadError);
          
          // Oferecer opção de salvar sem imagem
          Alert.alert(
            'Erro no Upload da Imagem',
            'Deseja salvar o visitante sem foto?',
            [
              { text: 'Cancelar', style: 'cancel' },
              { 
                text: 'Salvar sem Foto', 
                onPress: () => {
                  saveVisitorWithoutImage();
                }
              }
            ]
          );
          return;
        }
      }

      const visitorToInsert = {
        name: visitorData.name,
        gender: visitorData.gender,
        age: visitorData.age,
        telefone: visitorData.telefone,
        cpf: visitorData.cpf,
        rg: visitorData.rg,
        latitude: currentLatitude,
        longitude: currentLongitude,
        user_id: currentUser.id,
        registered_by: currentUser.name || 'Usuário',
        image_url: imageUrl,
        created_at: new Date().toISOString(),
      };

      console.log('Inserindo visitante no banco...');

      const { data, error } = await supabase
        .from('visitors')
        .insert([visitorToInsert])
        .select();

      if (error) throw error;

      Alert.alert('Sucesso', 'Visitante registrado com sucesso!');
      
      setVisitorData({
        name: '',
        gender: '',
        age: '',
        telefone: '',
        rg: '',
        cpf: '',
      });
      setPhotoUri(null);
      
      navigation.navigate('PageGeral');
      
    } catch (error) {
      console.error('Erro ao salvar visitante:', error);
      
      let errorMessage = 'Falha ao registrar visitante';
      
      if (error.code === '23505') {
        errorMessage = 'CPF ou RG já cadastrado';
      } else if (error.code === '23503') {
        errorMessage = 'Erro de referência: usuário não encontrado';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Erro', errorMessage);
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
            disabled={uploadingImage}
            style={tw`bg-blue-600 rounded-lg px-4 py-2 flex-row items-center ${uploadingImage ? 'opacity-50' : ''}`}
          >
            {uploadingImage ? (
              <ActivityIndicator size="small" color="white" style={tw`mr-2`} />
            ) : (
              <Icon name="image" size={18} color="white" style={tw`mr-2`} />
            )}
            <Text style={tw`text-white font-medium`}>
              {uploadingImage ? 'Processando...' : photoUri ? 'Alterar Foto' : 'Adicionar Foto'}
            </Text>
          </TouchableOpacity>
          
          {!photoUri && (
            <Text style={tw`text-gray-500 text-xs mt-2 text-center`}>
              A foto é opcional. Você pode salvar sem foto.
            </Text>
          )}
        </View>

        {/* Campos */}
        <View style={tw``}>
          <TextInput
            style={tw`border text-black border-gray-300 rounded-lg px-4 py-3`}
            placeholder="Nome *"
            placeholderTextColor="#888"
            value={visitorData.name}
            onChangeText={(text) => setVisitorData({ ...visitorData, name: text })}
          />
          
          <TextInput
            style={tw`border text-black border-gray-300 rounded-lg px-4 py-3`}
            placeholder="Idade *"
            placeholderTextColor="#888"
            keyboardType="numeric"
            value={visitorData.age}
            onChangeText={(text) => setVisitorData({ ...visitorData, age: text })}
          />
          
          <View style={tw`border border-gray-300 rounded-lg`}>
            <Picker
              selectedValue={visitorData.gender}
              onValueChange={(itemValue) =>
                setVisitorData({ ...visitorData, gender: itemValue })
              }
              style={tw`text-black`}
            >
              <Picker.Item label="Selecione o gênero" value="" />
              <Picker.Item label="Masculino" value="Masculino" />
              <Picker.Item label="Feminino" value="Feminino" />
            </Picker>
          </View>
          
          <TextInput
            style={tw`border text-black border-gray-300 rounded-lg px-4 py-3`}
            placeholder="Telefone"
            placeholderTextColor="#888"
            keyboardType="phone-pad"
            value={visitorData.telefone}
            onChangeText={(text) => {
              let cleaned = text.replace(/\D/g, '');
              let masked = cleaned;
              if (masked.length > 2) masked = `(${masked.slice(0, 2)}) ${masked.slice(2)}`;
              if (masked.length > 9) masked = `${masked.slice(0, 10)}-${masked.slice(10, 14)}`;
              masked = masked.replace(/[-\s()]$/, '');
              setVisitorData({ ...visitorData, telefone: masked });
            }}
          />
          
          <TextInput
            style={tw`border text-black border-gray-300 rounded-lg px-4 py-3`}
            placeholder="CPF *"
            placeholderTextColor="#888"
            value={visitorData.cpf}
            keyboardType="numeric"
            onChangeText={(text) => {
              let cleaned = text.replace(/\D/g, '');
              let masked = cleaned;
              if (masked.length > 3) masked = `${masked.slice(0, 3)}.${masked.slice(3)}`;
              if (masked.length > 6) masked = `${masked.slice(0, 7)}.${masked.slice(7)}`;
              if (masked.length > 9) masked = `${masked.slice(0, 11)}-${masked.slice(11, 13)}`;
              masked = masked.replace(/[.-]$/, '');
              setVisitorData({ ...visitorData, cpf: masked });
            }}
          />
          
          <TextInput
            style={tw`border text-black border-gray-300 rounded-lg px-4 py-3`}
            placeholder="RG *"
            placeholderTextColor="#888"
            value={visitorData.rg}
            keyboardType="numeric"
            onChangeText={(text) => {
              let cleaned = text.replace(/\D/g, '');
              let masked = cleaned;
              if (masked.length > 2) masked = `${masked.slice(0, 2)}.${masked.slice(2)}`;
              if (masked.length > 5) masked = `${masked.slice(0, 6)}.${masked.slice(6)}`;
              if (masked.length > 8) masked = `${masked.slice(0, 9)}-${masked.slice(9, 10)}`;
              masked = masked.replace(/[.-]$/, '');
              setVisitorData({ ...visitorData, rg: masked });
            }}
          />
        </View>

        {/* Informações do usuário */}
        {currentUser && (
          <View style={tw`mt-4 bg-blue-50 p-3 rounded-lg`}>
            <Text style={tw`text-blue-700 text-sm`}>
              Registrado por: {currentUser.name} (ID: {currentUser.id})
            </Text>
          </View>
        )}

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
          disabled={loading || !currentUser}
          style={tw`mt-6 bg-green-600 rounded-lg p-4 ${loading || !currentUser ? 'opacity-70' : ''}`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={tw`text-white font-bold text-lg text-center`}>
              {!currentUser ? 'Carregando...' : 'Salvar Visitante'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('ControladorDashboard')}
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