import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import tw from 'tailwind-react-native-classnames';
import useLocation from './localizacao';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const AdminPainel = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pavilionData, setPavilionData] = useState({ name: '', latitude: '', longitude: '' });
  const [routeData, setRouteData] = useState({ 
    name: '', 
    checkpoints: [] as {pavilionId: string, order: number, allowOverride: boolean}[] 
  });
  const [visitors, setVisitors] = useState([]);
  const [pavilions, setPavilions] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const { currentLatitude, currentLongitude } = useLocation();
  const navigation = useNavigation();

  // Verifica se o usuário é admin
  useEffect(() => {
    const checkAdmin = async () => {
      const admin = await checkIfUserIsAdmin();
      setIsAdmin(admin);
    };
    checkAdmin();
    fetchPavilions();
  }, []);

  // Função de verificação de admin
  const checkIfUserIsAdmin = async () => {
    try {
      const email = await AsyncStorage.getItem('currentUser');
      if (!email) return false;

      const { data, error } = await supabase
        .from('usersSpulse')
        .select('admin')
        .eq('email', email)
        .single();

      if (error) return false;
      return data?.admin === true || data?.admin === 'true';
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  // Buscar pavilhões
  const fetchPavilions = async () => {
    const { data, error } = await supabase.from('pavilions').select('*');
    if (!error) setPavilions(data || []);
  };

  // Criar novo pavilhão
  const handleAddPavilion = async () => {
    if (!pavilionData.name) {
      Alert.alert('Erro', 'Digite o nome do pavilhão.');
      return;
    }

    const { error } = await supabase.from('pavilions').insert([{
      name: pavilionData.name,
      latitude: currentLatitude,
      longitude: currentLongitude,
    }]);

    if (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível criar o pavilhão.');
    } else {
      Alert.alert('Sucesso', 'Pavilhão criado!');
      setPavilionData({ name: '', latitude: '', longitude: '' });
      fetchPavilions();
    }
  };

  // Adicionar checkpoint na rota
  const handleAddCheckpointToRoute = (pavilionId) => {
    const newCheckpoint = {
      pavilionId,
      order: routeData.checkpoints.length + 1,
      allowOverride: false
    };
    
    setRouteData({
      ...routeData,
      checkpoints: [...routeData.checkpoints, newCheckpoint],
    });
  };

  // Remover checkpoint da rota
  const handleRemoveCheckpoint = (index) => {
    const updatedCheckpoints = [...routeData.checkpoints];
    updatedCheckpoints.splice(index, 1);
    
    // Reordenar os checkpoints restantes
    const reorderedCheckpoints = updatedCheckpoints.map((checkpoint, idx) => ({
      ...checkpoint,
      order: idx + 1
    }));
    
    setRouteData({
      ...routeData,
      checkpoints: reorderedCheckpoints,
    });
  };

  // Alternar allow_override para um checkpoint
  const toggleAllowOverride = (index) => {
    const updatedCheckpoints = [...routeData.checkpoints];
    updatedCheckpoints[index] = {
      ...updatedCheckpoints[index],
      allowOverride: !updatedCheckpoints[index].allowOverride
    };
    
    setRouteData({
      ...routeData,
      checkpoints: updatedCheckpoints,
    });
  };

  // Criar rota com checkpoints
  const handleAddRoute = async () => {
    if (!routeData.name || routeData.checkpoints.length === 0) {
      Alert.alert('Erro', 'Preencha o nome da rota e adicione pelo menos um checkpoint.');
      return;
    }

    try {
      // 1) Inserir a rota
      const { data: routeInsert, error: routeError } = await supabase
        .from('visit_routes')
        .insert([{ name_route: routeData.name }]) // confirme o nome da coluna
        .select('id')
        .single();

      if (routeError) {
        console.error('Erro ao criar rota:', routeError);
        throw routeError;
      }

      // 2) Preparar checkpoints para inserção
      const checkpointsToInsert = routeData.checkpoints.map((checkpoint, index) => ({
        route_id: routeInsert.id,
        pavilion_id: checkpoint.pavilionId,
        order_number: checkpoint.order ?? index + 1,
        allow_override: checkpoint.allowOverride ?? false
      }));

      // 3) Inserir checkpoints da rota
      const { error: checkpointsError } = await supabase
        .from('route_checkpoints')
        .insert(checkpointsToInsert);

      if (checkpointsError) {
        console.error('Erro ao inserir checkpoints:', checkpointsError);
        throw checkpointsError;
      }

      Alert.alert('Sucesso', 'Rota criada com sucesso!');
      setRouteData({ name: '', checkpoints: [] });

    } catch (error) {
      console.error('Erro geral ao criar rota com checkpoints:', error);
      Alert.alert('Erro', 'Não foi possível criar a rota.');
    }
  };


  if (!isAdmin) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-50 p-6`}>
        <View style={tw`bg-white p-6 rounded-xl shadow-md w-full max-w-md`}>
          <Text style={tw`text-lg text-red-500 font-semibold text-center`}>
            Acesso restrito. Apenas administradores podem acessar esta página.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={tw`flex-1 bg-gray-50 p-4`}>
      <View style={tw`bg-white rounded-xl shadow-sm p-6 mb-6`}>
        <Text style={tw`text-2xl font-bold text-center text-gray-800 mb-2`}>Painel do Administrador</Text>
        <Text style={tw`text-sm text-gray-500 text-center mb-6`}>Gerencie pavilhões e rotas</Text>
      </View>

      {/* Formulário Pavilhão */}
      <View style={tw`bg-white rounded-xl shadow-sm p-6 mb-6`}>
        <Text style={tw`text-xl font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2`}>Criar Pavilhão</Text>
        <TextInput
          style={tw`border border-gray-300 rounded-lg px-4 py-3 mb-3 bg-gray-50 text-gray-800`}
          placeholder="Nome do pavilhão"
          placeholderTextColor="#9CA3AF"
          value={pavilionData.name}
          onChangeText={(text) => setPavilionData({ ...pavilionData, name: text })}
        />
        <TouchableOpacity
          onPress={handleAddPavilion}
          style={tw`bg-blue-600 rounded-lg p-4 shadow-sm`}
        >
          <Text style={tw`text-white text-center font-semibold text-base`}>Salvar Pavilhão</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        onPress={() => navigation.navigate('GerenciarRotas')}
        style={tw`
          bg-gradient-to-r from-blue-50 to-blue-100 
          rounded-xl p-5 
          flex-row items-center my-2 
          border border-blue-200
          active:bg-blue-200 
          active:shadow-inner
          transition-all
        `}
        activeOpacity={0.8}
      >
        <Icon name="map" size={22} color="#3B82F6" style={tw`mr-3`} />
        
        <View style={tw`flex-1`}>
          <Text style={tw`font-semibold text-blue-800 text-base`}>
            Gerenciar Rotas
          </Text>
          <Text style={tw`text-xs text-blue-600 mt-1`}>
            Administre todas as rotas criadas
          </Text>
        </View>
        
        <Icon name="arrow-forward" size={18} color="#3B82F6" />
      </TouchableOpacity>

      {/* Formulário Rota */}
      <View style={tw`bg-white rounded-xl shadow-sm p-6 mb-6`}>
        <View style={tw`pb-2`}>
            <Text style={tw`text-xl font-semibold text-gray-800 mb-4 border-b border-gray-200`}>Criar Rota para os Visitantes</Text>
            <Text style={tw`text-gray-800 text-sm`}>
                Registrar a rota dos checkpoints a ser seguida.
            </Text>
        </View>
        
        
        <TextInput
          style={tw`border border-gray-300 rounded-lg px-4 py-3 mb-4 bg-gray-50 text-gray-800`}
          placeholder="Nome da rota"
          placeholderTextColor="#9CA3AF"
          value={routeData.name}
          onChangeText={(text) => setRouteData({ ...routeData, name: text })}
        />

        <Text style={tw`text-gray-700 font-medium mb-2`}>Checkpoints da Rota:</Text>
        
        {routeData.checkpoints.length > 0 && (
          <View style={tw`mb-4 bg-gray-50 p-3 rounded-lg`}>
            {routeData.checkpoints.map((checkpoint, index) => {
              const pavilion = pavilions.find(p => p.id === checkpoint.pavilionId);
              return (
                <View key={index} style={tw`flex-row justify-between items-center mb-2 p-2 bg-white rounded border border-gray-200`}>
                  <View style={tw`flex-1`}>
                    <Text style={tw`font-medium`}>{pavilion?.name || 'Pavilhão não encontrado'}</Text>
                    <Text style={tw`text-xs text-gray-500`}>Ordem: {checkpoint.order}</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => toggleAllowOverride(index)}
                    style={tw`p-2 mr-2 rounded ${checkpoint.allowOverride ? 'bg-green-100' : 'bg-gray-100'}`}
                  >
                    <Text style={tw`text-xs ${checkpoint.allowOverride ? 'text-green-700' : 'text-gray-700'}`}>
                      {checkpoint.allowOverride ? 'Override ✓' : 'Override'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleRemoveCheckpoint(index)}
                    style={tw`p-2 bg-red-100 rounded`}
                  >
                    <Text style={tw`text-xs text-red-700`}>Remover</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <Text style={tw`text-gray-700 font-medium mb-2`}>Adicionar Checkpoints:</Text>
        <View style={tw`flex-row flex-wrap justify-between mb-4`}>
          {pavilions.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => handleAddCheckpointToRoute(p.id)}
              style={tw`w-[48%] p-3 mb-3 rounded-lg border ${routeData.checkpoints.some(c => c.pavilionId === p.id) ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'}`}
              disabled={routeData.checkpoints.some(c => c.pavilionId === p.id)}
            >
              <Text style={tw`text-center ${routeData.checkpoints.some(c => c.pavilionId === p.id) ? 'text-green-700 font-medium' : 'text-gray-700'}`}>
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleAddRoute}
          style={tw`bg-green-600 rounded-lg p-4 shadow-sm`}
          disabled={routeData.checkpoints.length === 0 || !routeData.name}
        >
          <Text style={tw`text-white text-center font-semibold text-base`}>
            Criar Rota ({routeData.checkpoints.length} checkpoints)
          </Text>
        </TouchableOpacity>

        {/* Voltar */}
        <TouchableOpacity
          onPress={() => navigation.navigate('PageGeral')}
          style={tw`mt-4 bg-gray-200 rounded-lg p-4`}
        >
          <Text style={tw`text-gray-800 font-medium text-center`}>Voltar</Text>
        </TouchableOpacity>
        
      </View>

      <Text style={tw`text-gray-400 text-xs text-center mb-6 mt-4`}>
        © {new Date().getFullYear()} Sistema Spulse
      </Text>
    </ScrollView>
  );
};

export default AdminPainel;