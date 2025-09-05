import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Image, Button, StyleSheet, Alert, Modal, TouchableOpacity, Linking, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../services/supabase';
import { useNavigation } from '@react-navigation/native';
import useLocation from './localizacao';
import tw from 'tailwind-react-native-classnames';
import { useUserContext } from './UserContext'; // Importando o contexto corretamente
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';


const RegistrarVisitante = ({ contextCurrentUser }) => {
    const [visitorData, setVisitorData] = useState({ 
        name: '', 
        gender: '', 
        age: '', 
        telefone: '', 
        pavilhao_destino: '' 
    });
    const [photoUri, setPhotoUri] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
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
                setCurrentUser(email);
                const { data, error } = await supabase
                    .from('usersSpulse')
                    .select('name')
                    .eq('email', email)
                    .single();
            
                if (data) {
                    setCurrentUserName(data.name);
                }
            }
        } catch (error) {
            console.error('Erro ao buscar usuário:', error);
        }
    };

    const handlePickImage = () => {
        launchImageLibrary(
            {
                mediaType: 'photo',
                maxWidth: 800,
                maxHeight: 800,
                quality: 0.8,
            },
            (response) => {
                if (!response.didCancel && !response.errorCode && response.assets?.[0]?.uri) {
                    setPhotoUri(response.assets[0].uri);
                }
            }
        );
    };

    const uploadImage = async (uri) => {
        const fileName = `visitor-${Date.now()}.jpg`;
        const { data: session } = await supabase.auth.getSession();
        
        if (!session?.session?.user) {
            throw new Error('User session not found');
        }

        const userFolder = `pz4m24_${session.session.user.id}`;
        const fullFileName = `${userFolder}/${fileName}`;

        const formData = new FormData();
        formData.append('file', {
            uri,
            type: 'image/jpeg',
            name: fileName,
        });

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('images_visitors')
            .upload(fullFileName, formData);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from('images_visitors')
            .getPublicUrl(fullFileName);

        return publicUrlData.publicUrl;
    };

    const saveVisitor = async () => {
        if (!photoUri) {
            Alert.alert('Atenção', 'Por favor, adicione uma foto do visitante');
            return;
        }

        if (!visitorData.name || !visitorData.age || !visitorData.pavilhao_destino) {
            Alert.alert('Atenção', 'Preencha todos os campos obrigatórios');
            return;
        }

        setLoading(true);
        try {
            const imageUrl = await uploadImage(photoUri);
            const currentDate = new Date();

            const { error } = await supabase.from('visitors').insert([{
                ...visitorData,
                hours: currentDate.toLocaleTimeString(),
                date: currentDate.toISOString().split('T')[0],
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

    const handleSaveVisitor = async () => {
        /*if (!contextCurrentUser) {
            Alert.alert('Erro', 'Você precisa estar logado para salvar um visitante.');
            return;
        }*/

        try {
            if (!photoUri) {
                Alert.alert('Erro', 'Por favor, selecione uma imagem antes de salvar.');
                return;
            }

            await saveVisitor(photoUri, visitorData); // Chamar a função para salvar a imagem e os dados
            navigation.navigate('PageGeral'); // Nome deve corresponder ao nome registrado no Navigator

        } catch (error) {
            console.error('Erro ao salvar visitante:', error);
            Alert.alert('Erro', 'Ocorreu um erro ao tentar salvar o visitante.');
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


    const handleRedirect = () => {
        navigation.navigate('PageGeral'); // Redireciona para a página PageGeral
    };

   return (
        <ScrollView contentContainerStyle={tw`flex-grow bg-gray-50 p-6`}>
            {/* Header */}
            <View style={tw`mb-8`}>
                <Text style={tw`text-2xl font-bold text-center text-gray-800`}>Cadastro de Visitante</Text>
                <Text style={tw`text-center text-gray-500 mt-1`}>Registre os dados do visitante</Text>
            </View>

            {/* Form Container */}
            <View style={tw`bg-white rounded-xl shadow-sm p-6 mb-6`}>
                {/* Photo Section */}
                <View style={tw`items-center mb-6`}>
                    {photoUri ? (
                        <>
                            <Image
                                source={{ uri: photoUri }}
                                style={tw`w-40 h-40 rounded-lg mb-4`}
                                resizeMode="cover"
                            />
                            <TouchableOpacity
                                onPress={() => setPhotoUri(null)}
                                style={tw`absolute top-0 right-0 bg-red-100 p-2 rounded-full`}
                            >
                                <Icon name="close" size={16} color="#EF4444" />
                            </TouchableOpacity>
                        </>
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
                        <Text style={tw`text-white font-medium`}>
                            {photoUri ? 'Alterar Foto' : 'Adicionar Foto'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Form Fields */}
                <View style={tw`space-y-4`}>
                    <View>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>Nome *</Text>
                        <TextInput
                            style={tw`border border-gray-300 rounded-lg px-4 py-3 text-gray-800`}
                            placeholder="Nome completo"
                            value={visitorData.name}
                            onChangeText={(text) => setVisitorData({...visitorData, name: text})}
                        />
                    </View>

                    <View>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>Idade *</Text>
                        <TextInput
                            style={tw`border border-gray-300 rounded-lg px-4 py-3 text-gray-800`}
                            placeholder="Idade"
                            keyboardType="numeric"
                            value={visitorData.age}
                            onChangeText={(text) => setVisitorData({...visitorData, age: text})}
                        />
                    </View>

                    <View>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>Gênero</Text>
                        <TextInput
                            style={tw`border border-gray-300 rounded-lg px-4 py-3 text-gray-800`}
                            placeholder="Gênero"
                            value={visitorData.gender}
                            onChangeText={(text) => setVisitorData({...visitorData, gender: text})}
                        />
                    </View>

                    <View>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>Telefone</Text>
                        <TextInput
                            style={tw`border border-gray-300 rounded-lg px-4 py-3 text-gray-800`}
                            placeholder="Telefone"
                            keyboardType="phone-pad"
                            value={visitorData.telefone}
                            onChangeText={(text) => setVisitorData({...visitorData, telefone: text})}
                        />
                    </View>

                    <View>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>Bloco de Destino *</Text>
                        <TextInput
                            style={tw`border border-gray-300 rounded-lg px-4 py-3 text-gray-800`}
                            placeholder="Bloco de destino"
                            value={visitorData.pavilhao_destino}
                            onChangeText={(text) => setVisitorData({...visitorData, pavilhao_destino: text})}
                        />
                    </View>
                </View>

                {/* Location Button */}
                {currentLatitude && currentLongitude && (
                    <TouchableOpacity
                        onPress={() => openMapModal(currentLatitude, currentLongitude)}
                        style={tw`mt-4 border border-blue-500 rounded-lg p-3 flex-row items-center justify-center`}
                    >
                        <Icon name="location" size={18} color="#3B82F6" style={tw`mr-2`} />
                        <Text style={tw`text-blue-600 font-medium`}>Ver Localização Atual</Text>
                    </TouchableOpacity>
                )}

                {/* Save Button */}
                <TouchableOpacity
                    onPress={saveVisitor}
                    disabled={loading}
                    style={tw`mt-6 bg-green-600 rounded-lg p-4 ${loading ? 'opacity-70' : ''}`}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={tw`text-white font-bold text-lg text-center`}>
                            Salvar Visitante
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
            </View>

            {/* Map Modal */}
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
