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

  // Configurações do NFC
  useEffect(() => {
    NfcManager.start();
    return () => {
      NfcManager.cancelTechnologyRequest();
    };
  }, []);

  // Buscar visitantes e dados do usuário
  useEffect(() => {
    fetchVisitorsData();
    fetchUserPavilion();
  }, []);

  const fetchVisitorsData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('visitors').select('*');
      if (error) throw error;
      setVisitorData(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os visitantes');
      console.error('Erro ao buscar visitantes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPavilion = async () => {
    try {
        const email = await AsyncStorage.getItem('currentUser');
        if (!email) {
            console.warn('Nenhum email encontrado no AsyncStorage');
            return;
        }

        const { data, error } = await supabase
            .from('checkpoints')
            .select('pavilion, date')
            .eq('user_email', email)
            .order('date', { ascending: false }) // Ordena pela data mais recente
            .limit(1)
            .single();

        if (error) throw error;
        
        if (data) {
            setPavilion(data.pavilion);
            console.log(`Pavilhão atual: ${data.pavilion} (data: ${data.date})`);
        } else {
            console.warn('Nenhum registro de checkpoint encontrado para:', email);
            Alert.alert(
                'Configuração necessária',
                'Você precisa registrar seu pavilhão antes de marcar checkpoints',
                [{ text: 'OK', onPress: () => navigation.navigate('Checkpoint') }]
            );
        }
      } catch (error) {
          console.error('Erro ao buscar pavilhão:', error);
          Alert.alert(
              'Erro de configuração',
              'Não foi possível determinar seu pavilhão atual',
              [{ text: 'Configurar', onPress: () => navigation.navigate('Checkpoint') }]
          );
      }
  };

  const handleSelectVisitor = (visitor) => {
    setSelectedVisitor(visitor);
  };

  const readNfcTag = async () => {
    try {
        setNfcReading(true);
        await NfcManager.requestTechnology(NfcTech.Ndef);
        
        const tag = await NfcManager.getTag();
        console.log('Tag NFC lida:', tag);

        if (tag.ndefMessage && tag.ndefMessage.length > 0) {
            const record = tag.ndefMessage[0];
            let payloadContent = '';
            
            if (record.tnf === Ndef.TNF_WELL_KNOWN && record.type[0] === 0x55) {
                payloadContent = Ndef.uri.decodePayload(record.payload);
            } else if (record.tnf === Ndef.TNF_WELL_KNOWN && arrayEquals(record.type, Ndef.RTD_TEXT)) {
                payloadContent = Ndef.text.decodePayload(record.payload);
            } else {
                payloadContent = String.fromCharCode.apply(null, record.payload);
            }

            console.log('Conteúdo decodificado:', payloadContent);
            
            // Extrai o ID do visitante
            const visitorId = payloadContent.split('/').pop();
            console.log('ID do visitante extraído:', visitorId);

            if (visitorId) {
                // Verifica se a lista de visitantes foi carregada
                if (!visitorData || visitorData.length === 0) {
                    Alert.alert('Atenção', 'Lista de visitantes não carregada. Aguarde...');
                    await fetchVisitorsData(); // Tenta carregar novamente
                }

                // Busca o visitante na lista
                const foundVisitor = visitorData.find(v => v.id.toString() === visitorId.toString());
                
                if (foundVisitor) {
                    console.log('Visitante encontrado:', foundVisitor);
                    setSelectedVisitor(foundVisitor);
                    Alert.alert('Visitante Identificado', `Nome: ${foundVisitor.name}\nID: ${foundVisitor.id}`);
                } else {
                    Alert.alert(
                        'Visitante não encontrado', 
                        `Nenhum visitante com ID ${visitorId} foi encontrado.\n\nVerifique se:\n1. O visitante está cadastrado\n2. A lista está atualizada`,
                        [
                            {
                                text: 'Atualizar Lista',
                                onPress: async () => {
                                    await fetchVisitorsData();
                                    readNfcTag(); // Tenta novamente após atualizar
                                }
                            },
                            { text: 'OK' }
                        ]
                    );
                }
            } else {
                Alert.alert('Erro', 'Não foi possível extrair um ID válido da tag NFC');
            }
        } else {
            Alert.alert('Erro', 'Nenhuma mensagem NDEF encontrada na tag');
        }
      } catch (error) {
          console.error('Erro na leitura NFC:', error);
          Alert.alert('Erro', 'Falha ao ler a pulseira NFC');
      } finally {
          NfcManager.cancelTechnologyRequest();
          setNfcReading(false);
      }
  };

  // Função auxiliar para comparar arrays
  function arrayEquals(a: number[], b: number[]) {
      return a.length === b.length && a.every((val, index) => val === b[index]);
  }

  const registerCheckpoint = async (visitorId) => {
    if (!visitorId) {
      Alert.alert('Atenção', 'Selecione um visitante primeiro');
      return;
    }

    if (!pavilion) {
      Alert.alert('Erro', 'Pavilhão não configurado para este usuário');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('checkpoints_visitors').insert([
        { 
          visitor_id: visitorId, 
          pavilion, 
          time: new Date().toISOString() 
        },
      ]);

      if (error) throw error;

      Alert.alert('Sucesso', 'Checkpoint registrado com sucesso');
      setSelectedVisitor(null);
    } catch (error) {
      console.error('Erro ao registrar checkpoint:', error);
      Alert.alert('Erro', 'Falha ao registrar o checkpoint');
    } finally {
      setLoading(false);
    }
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
            <Text style={tw`text-gray-700 ml-2`}>Bloco: {pavilion}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={tw`p-4`}>
        {/* NFC Section */}
        <View style={tw`mb-6 bg-white rounded-xl shadow-sm p-5`}>
          <Text style={tw`text-lg font-semibold text-gray-800 mb-3`}>Identificação por NFC</Text>
          <Text style={tw`text-gray-600 mb-4`}>Aproxime a pulseira NFC do visitante para identificação automática</Text>
          
          <TouchableOpacity
            onPress={readNfcTag}
            disabled={nfcReading}
            style={tw`bg-blue-600 rounded-lg p-4 flex-row items-center justify-center ${nfcReading ? 'opacity-70' : ''}`}
          >
            <Icon name="scan" size={20} color="white" style={tw`mr-2`} />
            <Text style={tw`text-white font-medium text-lg`}>
              {nfcReading ? 'Lendo...' : 'Ler Pulseira NFC'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Manual Selection Section */}
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

        {/* Selected Visitor Info */}
        {selectedVisitor && (
          <View style={tw`mb-6 bg-white rounded-xl shadow-sm p-5`}>
            <Text style={tw`text-lg font-semibold text-gray-800 mb-3`}>Informações do Visitante</Text>
            <View style={tw`flex-row items-center mb-2`}>
              <Icon name="person" size={18} color="#4B5563" />
              <Text style={tw`text-gray-700 ml-2`}>{selectedVisitor.name}</Text>
            </View>
            <View style={tw`flex-row items-center mb-2`}>
              <Icon name="id-card" size={18} color="#4B5563" />
              <Text style={tw`text-gray-700 ml-2`}>ID: {selectedVisitor.id}</Text>
            </View>
            <View style={tw`flex-row items-center`}>
              <Icon name="time" size={18} color="#4B5563" />
              <Text style={tw`text-gray-700 ml-2`}>Horário atual: {new Date().toLocaleTimeString()}</Text>
            </View>
          </View>
        )}

        {/* Register Button */}
        <TouchableOpacity
          onPress={() => registerCheckpoint(selectedVisitor?.id)}
          disabled={!selectedVisitor || loading}
          style={tw`bg-green-600 rounded-lg p-4 ${!selectedVisitor || loading ? 'opacity-70' : ''}`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={tw`text-white font-bold text-lg text-center`}>
              Registrar Checkpoint
            </Text>
          )}
        </TouchableOpacity>
        {/* Back Button */}
        <TouchableOpacity
            onPress={() => navigation.navigate('PageGeral')}
            style={tw`mt-4 bg-gray-200 rounded-lg p-4`}
        >
            <Text style={tw`text-gray-800 font-medium text-center`}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Visitor Selection Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={tw`flex-1 justify-center bg-black bg-opacity-50 p-4`}>
          <View style={tw`bg-white rounded-xl p-6`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <Text style={tw`text-xl font-bold text-gray-800`}>Selecione um Visitante</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {visitorData.map((visitor) => (
                <TouchableOpacity
                  key={visitor.id}
                  onPress={() => {
                    handleSelectVisitor(visitor);
                    setModalVisible(false);
                  }}
                  style={tw`p-4 border-b border-gray-100 flex-row items-center`}
                >
                  <View style={tw`bg-blue-100 p-2 rounded-full mr-3`}>
                    <Icon name="person" size={18} color="#3B82F6" />
                  </View>
                  <Text style={tw`text-gray-800 flex-1`}>{visitor.name}</Text>
                  <Icon name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* NFC Reading Modal */}
      <Modal visible={nfcReading} transparent animationType="fade">
        <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}>
          <View style={tw`bg-white rounded-xl p-6 w-5/6 items-center`}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={tw`text-lg text-gray-800 mt-4 text-center`}>
              Aproxime a pulseira NFC do dispositivo...
            </Text>
            <TouchableOpacity
              onPress={() => {
                setNfcReading(false);
                NfcManager.cancelTechnologyRequest();
              }}
              style={tw`mt-4 bg-red-100 px-4 py-2 rounded-lg`}
            >
              <Text style={tw`text-red-600 font-medium`}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MarcarCheckpoints;