import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { supabase } from '../services/supabase';
import Icon from 'react-native-vector-icons/Ionicons';
import tw from 'tailwind-react-native-classnames';
import { useNavigation } from '@react-navigation/native';

const GerenciarRotas = () => {
  const [rotas, setRotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detalhesVisiveis, setDetalhesVisiveis] = useState({});

  const navigation = useNavigation();

  useEffect(() => {
    carregarRotas();
  }, []);

  const carregarRotas = async () => {
    try {
      setLoading(true);
      
      // Buscar rotas com informações dos checkpoints
      const { data: rotasData, error: rotasError } = await supabase
        .from('visit_routes')
        .select(`
          id,
          name_route,
          created_at,
          route_checkpoints (
            id,
            order_number,
            allow_override,
            pavilions (
              id,
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (rotasError) throw rotasError;

      setRotas(rotasData || []);
    } catch (error) {
      console.error('Erro ao carregar rotas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as rotas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleDetalhes = (rotaId) => {
    setDetalhesVisiveis(prev => ({
      ...prev,
      [rotaId]: !prev[rotaId]
    }));
  };

  const excluirRota = async (rotaId, nomeRota) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Tem certeza que deseja excluir a rota "${nomeRota}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              // Primeiro excluir os checkpoints da rota (devido à constraint foreign key)
              const { error: checkpointsError } = await supabase
                .from('route_checkpoints')
                .delete()
                .eq('route_id', rotaId);

              if (checkpointsError) throw checkpointsError;

              // Depois excluir a rota
              const { error: rotaError } = await supabase
                .from('visit_routes')
                .delete()
                .eq('id', rotaId);

              if (rotaError) throw rotaError;

              Alert.alert('Sucesso', 'Rota excluída com sucesso!');
              carregarRotas();
            } catch (error) {
              console.error('Erro ao excluir rota:', error);
              Alert.alert('Erro', 'Não foi possível excluir a rota');
            }
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    carregarRotas();
  };

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={tw`mt-4 text-gray-600`}>Carregando rotas...</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`bg-white p-6 shadow-sm`}>
        <View style={tw`flex-row justify-between items-center`}>
          <View>
            <Text style={tw`text-2xl font-bold text-gray-800`}>Gerenciar Rotas</Text>
            <Text style={tw`text-gray-500`}>
              {rotas.length} {rotas.length === 1 ? 'rota encontrada' : 'rotas encontradas'}
            </Text>
          </View>
          <TouchableOpacity onPress={carregarRotas}>
            <Icon name="refresh" size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={tw`p-4`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {rotas.length === 0 ? (
          <View style={tw`bg-white rounded-xl p-8 items-center shadow-sm`}>
            <Icon name="map-outline" size={48} color="#9CA3AF" />
            <Text style={tw`text-gray-600 text-lg mt-4 text-center`}>
              Nenhuma rota encontrada
            </Text>
            <Text style={tw`text-gray-400 text-center mt-2`}>
              Crie sua primeira rota para começar
            </Text>
          </View>
        ) : (
          rotas.map((rota) => (
            <View key={rota.id} style={tw`bg-white rounded-xl p-5 shadow-sm mb-4`}>
              {/* Cabeçalho da Rota */}
              <View style={tw`flex-row justify-between items-start`}>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-lg font-semibold text-gray-800`}>
                    {rota.name_route}
                  </Text>
                  <Text style={tw`text-sm text-gray-500 mt-1`}>
                    Criada em: {new Date(rota.created_at).toLocaleDateString('pt-BR')}
                  </Text>
                  <Text style={tw`text-sm text-gray-500`}>
                    {rota.route_checkpoints?.length || 0} checkpoints
                  </Text>
                </View>
                
                <View style={tw`flex-row`}>
                  <TouchableOpacity
                    onPress={() => toggleDetalhes(rota.id)}
                    style={tw`p-2 mr-2`}
                  >
                    <Icon
                      name={detalhesVisiveis[rota.id] ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#3B82F6"
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => excluirRota(rota.id, rota.name_route)}
                    style={tw`p-2`}
                  >
                    <Icon name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Detalhes da Rota */}
              {detalhesVisiveis[rota.id] && (
                <View style={tw`mt-4 border-t border-gray-100 pt-4`}>
                  <Text style={tw`font-medium text-gray-700 mb-3`}>Checkpoints da Rota:</Text>
                  
                  {rota.route_checkpoints && rota.route_checkpoints.length > 0 ? (
                    rota.route_checkpoints
                      .sort((a, b) => a.order_number - b.order_number)
                      .map((checkpoint, index) => (
                        <View
                          key={checkpoint.id}
                          style={tw`flex-row items-center py-2 ${
                            index > 0 ? 'border-t border-gray-100' : ''
                          }`}
                        >
                          <View style={tw`w-6 h-6 rounded-full bg-blue-100 items-center justify-center mr-3`}>
                            <Text style={tw`text-xs font-bold text-blue-600`}>
                              {checkpoint.order_number}
                            </Text>
                          </View>
                          
                          <View style={tw`flex-1`}>
                            <Text style={tw`text-gray-800`}>
                              {checkpoint.pavilions?.name || 'Pavilhão não encontrado'}
                            </Text>
                            {checkpoint.allow_override && (
                              <Text style={tw`text-xs text-green-600 mt-1`}>
                                ⓘ Permite desvio de rota
                              </Text>
                            )}
                          </View>
                        </View>
                      ))
                  ) : (
                    <Text style={tw`text-gray-500 italic`}>
                      Nenhum checkpoint configurado para esta rota
                    </Text>
                  )}
                </View>
              )}
            </View>
          ))
        )}

        {/* Informações */}
        <View style={tw`bg-blue-50 rounded-xl p-5 mt-4 border border-blue-200`}>
          <View style={tw`flex-row items-start mb-3`}>
            <Icon name="information-circle" size={20} color="#3B82F6" style={tw`mr-2 mt-0.5`} />
            <Text style={tw`text-blue-800 flex-1`}>
              <Text style={tw`font-semibold`}>Importante:</Text> Ao excluir uma rota, todos os checkpoints associados a ela também serão removidos. Esta ação não pode ser desfeita.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Botão Voltar */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={tw`m-4 bg-gray-300 rounded-lg p-4`}
      >
        <Text style={tw`text-gray-800 font-medium text-center`}>Voltar</Text>
      </TouchableOpacity>
    </View>
  );
};

export default GerenciarRotas;