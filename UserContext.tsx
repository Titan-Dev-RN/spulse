import React, { useState, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UserContext = React.createContext();

export const UserProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);

    const loginUser = async (userEmail) => {
        await AsyncStorage.setItem('currentUser', userEmail);
        setCurrentUser(userEmail);
    };

    const logoutUser = async () => {
        await AsyncStorage.removeItem('currentUser');
        setCurrentUser(null);
    };

    return (
        <UserContext.Provider value={{ currentUser, loginUser, logoutUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUserContext = () => {
    return useContext(UserContext);
};
