import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { supabase } from '../services/supabase';
import { useNavigation } from '@react-navigation/native';
import tw from 'tailwind-react-native-classnames';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MarcarCheckpoints = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [visitorData, setVisitorData] = useState([]);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [nfcReading, setNfcReading] = useState(false);
  const [pavilion, setPavilion] = useState('');
  const [checkpoints, setCheckpoints] = useState([]);
  const [loadingCheckpoints, setLoadingCheckpoints] = useState(false);
  const year = new Date().getFullYear();

  const [currentUser, setCurrentUser] = useState(null);

  // Inicializa NFC
  useEffect(() => {
    NfcManager.start();
    return () => NfcManager.cancelTechnologyRequest();
  }, []);

  // Busca visitantes e pavilhão do usuário
  useEffect(() => {
    fetchVisitorsData();
    fetchUserPavilion();
    fetchUser();
  }, []);

  const fetchUser = async () => {
    // Obter email do usuário do AsyncStorage
    const email = await AsyncStorage.getItem('currentUser');
    console.log('Email do usuário:', email);

    if (email) {
      // Buscar informações completas do usuário na tabela usersSpulse usando o email
      const { data: userData, error: userError } = await supabase
        .from('usersSpulse')
        .select('id, name, email')
        .eq('email', email)
        .single();

      console.log('Dados do usuário:', userData);

      if (!userError && userData) {
        setCurrentUser(userData);
      } else {
        console.error('Erro ao buscar usuário:', userError);
      }
    }
  }

  // Buscar checkpoints quando um visitante é selecionado
  useEffect(() => {
    if (selectedVisitor) {
      fetchVisitorCheckpoints(selectedVisitor.id);
    } else {
      setCheckpoints([]);
    }
  }, [selectedVisitor]);

  const fetchVisitorsData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('visitors').select('*');
      if (error) throw error;
      setVisitorData(data || []);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os visitantes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPavilion = async () => {
    try {
      const email = await AsyncStorage.getItem('currentUser');
      if (!email) return;

      const { data, error } = await supabase
        .from('agent_checkpoints')
        .select('pavilion_id (name)')
        .eq('user_email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        throw error;
      }

      if (data?.pavilion_id) {
        setPavilion(data?.pavilion_id?.name);
      } else {
        Alert.alert(
          'Configuração necessária',
          'Você precisa registrar seu pavilhão antes de marcar checkpoints',
          [{ text: 'OK', onPress: () => navigation.navigate('MarcarCheckpoints') }]
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Configuração necessária',
        'Você precisa registrar seu pavilhão antes de marcar checkpoints',
        [{ text: 'OK', onPress: () => navigation.navigate('MarcarCheckpoints') }]
      );
    }
  };

  const fetchVisitorCheckpoints = async (visitorId) => {
    try {
      setLoadingCheckpoints(true);
      const { data, error } = await supabase
        .from('visitor_checkpoints')
        .select('*, pavilions (name)')
        .eq('visitor_id', visitorId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setCheckpoints(data || []);
    } catch (error) {
      console.error('Erro ao buscar checkpoints:', error);
      Alert.alert('Erro', 'Não foi possível carregar os checkpoints do visitante');
    } finally {
      setLoadingCheckpoints(false);
    }
  };

  const handleSelectVisitor = (visitor) => setSelectedVisitor(visitor);

  const readNfcTag = async () => {
    try {
      setNfcReading(true);
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      if (!tag?.ndefMessage?.length) throw new Error('Nenhuma mensagem NDEF encontrada');

      const record = tag.ndefMessage[0];
      let payloadContent = '';

      if (record.tnf === Ndef.TNF_WELL_KNOWN && record.type[0] === 0x55) {
        payloadContent = Ndef.uri.decodePayload(record.payload);
      } else if (record.tnf === Ndef.TNF_WELL_KNOWN && arrayEquals(record.type, Ndef.RTD_TEXT)) {
        payloadContent = Ndef.text.decodePayload(record.payload);
      } else {
        payloadContent = String.fromCharCode.apply(null, record.payload);
      }

      const visitorId = payloadContent.split('/').pop();
      if (!visitorId) throw new Error('ID do visitante inválido');

      const foundVisitor = visitorData.find(v => v.id.toString() === visitorId.toString());
      if (foundVisitor) {
        setSelectedVisitor(foundVisitor);
        Alert.alert('Visitante Identificado', `${foundVisitor.name} (ID: ${foundVisitor.id})`);
      } else {
        Alert.alert(
          'Visitante não encontrado',
          `Nenhum visitante com ID ${visitorId} foi encontrado`,
          [
            { text: 'Atualizar Lista', onPress: async () => { await fetchVisitorsData(); readNfcTag(); } },
            { text: 'OK' }
          ]
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao ler a pulseira NFC');
    } finally {
      setNfcReading(false);
      NfcManager.cancelTechnologyRequest();
    }
  };

  function arrayEquals(a, b) {
    return a.length === b.length && a.every((val, idx) => val === b[idx]);
  }

  const registerCheckpoint = async (visitorId) => {
    if (!visitorId) {
      Alert.alert('Atenção', 'Selecione um visitante primeiro');
      return;
    }

    if (!pavilion) {
      Alert.alert('Erro', 'Pavilhão não configurado');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('visitor_checkpoints').insert([
        { 
          visitor_id: visitorId, 
          pavilion: pavilion, 
          timestamp: new Date().toISOString(),
          registered_by: currentUser.id
        }
      ]);
      
      if (error) throw error;

      Alert.alert('Sucesso', 'Checkpoint registrado!');
      
      // Atualizar lista de checkpoints
      fetchVisitorCheckpoints(visitorId);
      
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao registrar checkpoint');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`bg-white p-6 shadow-sm`}>
        <Text style={tw`text-2xl font-bold text-gray-800`}>Registro de Checkpoints</Text>
        <Text style={tw`text-gray-500 mt-1`}>Registre a passagem de visitantes pelo seu bloco</Text>
        {pavilion && (
          <View style={tw`mt-2 flex-row items-center`}>
            <Icon name="business" size={18} color="#4B5563" />
            <Text style={tw`text-gray-700 ml-2`}>Pavilhão: {pavilion}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={tw`p-4`}>
        {/* NFC */}
        <View style={tw`mb-6 bg-white rounded-xl shadow-sm p-5`}>
          <Text style={tw`text-lg font-semibold text-gray-800 mb-3`}>Identificação por NFC</Text>
          <TouchableOpacity
            onPress={readNfcTag}
            disabled={nfcReading}
            style={tw`bg-blue-600 rounded-lg p-4 flex-row items-center justify-center ${nfcReading ? 'opacity-70' : ''}`}
          >
            <Icon name="scan" size={20} color="white" style={tw`mr-2`} />
            <Text style={tw`text-white font-medium text-lg`}>{nfcReading ? 'Lendo...' : 'Ler Pulseira NFC'}</Text>
          </TouchableOpacity>
        </View>

        {/* Seleção Manual */}
        <View style={tw`mb-6 bg-white rounded-xl shadow-sm p-5`}>
          <Text style={tw`text-lg font-semibold text-gray-800 mb-3`}>Visitante Selecionado</Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={tw`border-2 ${selectedVisitor ? 'border-solid border-blue-400' : 'border-dashed border-gray-300'} rounded-lg p-4 items-center`}
          >
            {selectedVisitor ? (
              <>
                <Icon name="person" size={24} color="#3B82F6" />
                <Text style={tw`text-gray-800 mt-2 font-medium`}>{selectedVisitor.name}</Text>
                <Text style={tw`text-gray-500 text-sm mt-1`}>ID: {selectedVisitor.id}</Text>
              </>
            ) : (
              <>
                <Icon name="person-add" size={24} color="#6B7280" />
                <Text style={tw`text-gray-700 mt-2`}>Selecionar Visitante</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Checkpoints do Visitante */}
        {selectedVisitor && (
          <View style={tw`mb-6 bg-white rounded-xl shadow-sm p-5`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <Text style={tw`text-lg font-semibold text-gray-800`}>Histórico de Checkpoints</Text>
              <TouchableOpacity onPress={() => fetchVisitorCheckpoints(selectedVisitor.id)}>
                <Icon name="refresh" size={20} color="#3B82F6" />
              </TouchableOpacity>
            </View>

            {loadingCheckpoints ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : checkpoints.length === 0 ? (
              <Text style={tw`text-gray-500 text-center py-4`}>
                Nenhum checkpoint registrado para este visitante
              </Text>
            ) : (
              <View>
                {checkpoints.map((checkpoint, index) => (
                  <View key={checkpoint.id} style={tw`border-b border-gray-100 py-3 ${index === 0 ? 'border-t' : ''}`}>
                    <View style={tw`flex-row justify-between items-start mb-1`}>
                      <Text style={tw`font-medium text-gray-800`}>
                        {checkpoint.pavilion?.name || checkpoint.pavilion}
                      </Text>
                      <Text style={tw`text-sm text-gray-500`}>
                        {formatDateTime(checkpoint.timestamp)}
                      </Text>
                    </View>
                    {checkpoint.registered_by && (
                      <Text style={tw`text-xs text-gray-400`}>
                        Registrado por: {checkpoint.registered_by}
                      </Text>
                    )}
                  </View>
                ))}
                <Text style={tw`text-sm text-gray-500 mt-3`}>
                  Total de checkpoints: {checkpoints.length}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Registrar Checkpoint */}
        <TouchableOpacity
          onPress={() => registerCheckpoint(selectedVisitor?.id)}
          disabled={!selectedVisitor || loading}
          style={tw`bg-green-600 rounded-lg p-4 ${!selectedVisitor || loading ? 'opacity-70' : ''}`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={tw`text-white font-bold text-lg text-center`}>
              Registrar Checkpoint em {pavilion}
            </Text>
          )}
        </TouchableOpacity>

        {/* Limpar Seleção */}
        {selectedVisitor && (
          <TouchableOpacity
            onPress={() => setSelectedVisitor(null)}
            style={tw`mt-3 bg-gray-300 rounded-lg p-3`}
          >
            <Text style={tw`text-gray-700 font-medium text-center`}>Limpar Seleção</Text>
          </TouchableOpacity>
        )}

        {/* Voltar */}
        <TouchableOpacity
          onPress={() => navigation.navigate('PageGeral')}
          style={tw`mt-4 bg-gray-200 rounded-lg p-4`}
        >
          <Text style={tw`text-gray-800 font-medium text-center`}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de Seleção de Visitante */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={tw`flex-1 justify-center bg-black bg-opacity-50 p-4`}>
          <View style={tw`bg-white rounded-xl p-6 max-h-96`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <Text style={tw`text-xl font-bold text-gray-800`}>Selecione um Visitante</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {visitorData.map(visitor => (
                <TouchableOpacity
                  key={visitor.id}
                  onPress={() => { handleSelectVisitor(visitor); setModalVisible(false); }}
                  style={tw`p-4 border-b border-gray-100 flex-row items-center`}
                >
                  <View style={tw`bg-blue-100 p-2 rounded-full mr-3`}>
                    <Icon name="person" size={18} color="#3B82F6" />
                  </View>
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-gray-800 font-medium`}>{visitor.name}</Text>
                    <Text style={tw`text-gray-500 text-xs`}>ID: {visitor.id}</Text>
                  </View>
                  <Icon name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* NFC Modal */}
      <Modal visible={nfcReading} transparent animationType="fade">
        <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}>
          <View style={tw`bg-white rounded-xl p-6 w-5/6 items-center`}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={tw`text-lg text-gray-800 mt-4 text-center`}>Aproxime a pulseira NFC do dispositivo...</Text>
            <TouchableOpacity
              onPress={() => { setNfcReading(false); NfcManager.cancelTechnologyRequest(); }}
              style={tw`mt-4 bg-red-100 px-4 py-2 rounded-lg`}
            >
              <Text style={tw`text-red-600 font-medium`}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Versão */}
      <View style={tw`mt-6 items-center pb-4`}>
        <Text style={tw`text-gray-400 text-sm`}>Versão 1.0.0</Text>
        <Text style={tw`text-gray-400 text-xs`}>© {year} Sistema Spulse</Text>
      </View>
    </View>
  );
};

export default MarcarCheckpoints;