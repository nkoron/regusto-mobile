import AsyncStorage from '@react-native-async-storage/async-storage';
import {Address} from "@/app/header";
import * as Location from "expo-location";
import {CartItem} from "@/app/commercePage";
import {UpdatedUserData, UserData} from "@/app/profile";
import {ExpiringProduct} from "@/app/home";
import {Order} from "./orders"


async function handleResponse(response: Response) {
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (error) {
        console.error('Error parsing JSON:', text);
        throw new Error(`Invalid JSON response: ${text}`);
    }
}

const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    const id = await AsyncStorage.getItem('userid');
    if (!token || !id) {
        throw new Error('No token or user id found');
    }
    return { token, id };
};

export const fetchFavorites = async (): Promise<{ commerce_id: string }[]> => {
    const { token } = await getAuthHeaders();

    const response = await fetch('https://regusto.azurewebsites.net/api/favorite/commerce', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        // throw new Error(`HTTP error! status: ${response.status}`);
        console.log(response.status);
        throw { status: response.status, message: response.statusText };
    }

    return handleResponse(response);
};

export const fetchStores = async (): Promise<any[]> => {
    const { token } = await getAuthHeaders();

    const response = await fetch('https://regusto.azurewebsites.net/api/commerce', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        // throw new Error(`HTTP error! status: ${response.status}`);
        throw { status: response.status, message: response.statusText };
    }

    return handleResponse(response);
};

export const fetchNearbyStores = async (): Promise<any[]> => {
    const { token, id } = await getAuthHeaders();

    const currentLocation = await getCurrentLocation();

    const response = await fetch(`https://regusto.azurewebsites.net/api/user/${id}/nearCommerce`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            latitude: currentLocation?.latitude,
            longitude: currentLocation?.longitude
        })
    });

    if (!response.ok) {
        throw { status: response.status, message: response.statusText };
    }

    return handleResponse(response);
};

export const fetchSavedAddresses = async () => {
    const { token, id } = await getAuthHeaders();

    const response = await fetch(`https://regusto.azurewebsites.net/api/user/${id}/addresses`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
        // throw new Error('Failed to fetch addresses');
        throw { status: response.status, message: response.statusText };
    }
    return response.json();
};

export const fetchCurrentAddress = async () => {
    const token = await AsyncStorage.getItem('token');
    const id = await AsyncStorage.getItem('userid');
    if (!token || !id) throw new Error('No token or user id found');

    const response = await fetch(`https://regusto.azurewebsites.net/api/user/${id}/activeaddress`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw { status: response.status, message: response.statusText };

    const currentAddressData = await response.json();

    if (!currentAddressData) {
        return getCurrentLocation();
    }

    const ivoTeReOdio: Address = { // I hate you Ivo
        id: currentAddressData.address.id,
        longitude: currentAddressData.address.longitude,
        latitude: currentAddressData.address.latitude,
        data: currentAddressData.address.data,
        description: currentAddressData.description,
        floor_number: currentAddressData.floor_number
    }

    return ivoTeReOdio;
};

const getCurrentLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
    }

    let location = await Location.getCurrentPositionAsync({});
    let address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
    });

    if (address[0]) {
        const newAddress: Address = {
            id: 'current',
            longitude: location.coords.longitude,
            latitude: location.coords.latitude,
            data: `${address[0].name}, ${address[0].street}, ${address[0].city}, ${address[0].region}, ${address[0].country} ${address[0].postalCode}`,
        };
        // setCurrentAddress(newAddress);
        // await queryClient.invalidateQueries({queryKey: ['nearbyStores']});
        // await queryClient.invalidateQueries({queryKey: ['currentAddress']});
        return newAddress;
    }
    return null;
};

export const fetchCartItemCount = async () => {
    const { token } = await getAuthHeaders();

    const response = await fetch('https://regusto.azurewebsites.net/api/shop_cart', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        // throw new Error('Failed to fetch cart items');
        throw { status: response.status, message: response.statusText };
    }
    const cartItems: CartItem[] = await response.json();
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
};

export const fetchUserData = async (): Promise<UserData> => {
    const { token, id } = await getAuthHeaders();

    const response = await fetch(`https://regusto.azurewebsites.net/api/user/${id}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        // throw new Error(`Failed to fetch user data: ${response.statusText}`);
        throw { status: response.status, message: response.statusText };
    }
    const data = await response.json();
    return data[0];
};

export const updateUserData = async (updatedData: Partial<UpdatedUserData>): Promise<void> => {
    const { token, id } = await getAuthHeaders();

    if (!token || !id) {
        throw new Error('No token or user ID found');
    }

    const response = await fetch(`https://regusto.azurewebsites.net/api/user/${id}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
    });

    if (!response.ok) {
        // throw new Error(`Failed to update user data: ${response.statusText}`);
        throw { status: response.status, message: response.statusText };

    }

    const result = await response.json();
    if (result === false || (typeof result === 'object' && result.success === false)) {
        throw new Error('Update failed according to server response');
    }
};

export const selectAddress = async (address: Address): Promise<void> => {
    const { token, id } = await getAuthHeaders();
    const response = await fetch(`https://regusto.azurewebsites.net/api/user/${id}/addresses/${address.id}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        // throw new Error('Failed to set current address');
        throw { status: response.status, message: response.statusText };
    }
};

export const confirmNewAddress = async (address: Address): Promise<Address> => {
    const { token, id } = await getAuthHeaders();

            const addressData = {
                floor_number: address.floor_number,
                description: address.description,
                data: address.data,
                latitude: address.latitude,
                longitude: address.longitude,
            };
    const response = await fetch(`https://regusto.azurewebsites.net/api/user/${id}/addresses`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(addressData),
    });

    if (!response.ok) {
        throw { status: response.status, message: response.statusText };
        // throw new Error('Failed to add new address');
    }

    return response.json();
};

export const updateAddress = async (updatedAddress: Address): Promise<Address> => {
    const { token, id } = await getAuthHeaders();
    const response = await fetch(`https://regusto.azurewebsites.net/api/user/${id}/addresses/${updatedAddress.id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatedAddress),
    });

    if (!response.ok) {
        throw { status: response.status, message: response.statusText };
        // throw new Error('Failed to update address');
    }

    return response.json();
};

export const deleteAddress = async (addressId: string): Promise<void> => {
    const { token, id } = await getAuthHeaders();
    const response = await fetch(`https://regusto.azurewebsites.net/api/user/${id}/addresses/${addressId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw { status: response.status, message: response.statusText };
        // throw new Error('Failed to delete address');
    }
};

export const fetchExpiringProducts = async (): Promise<ExpiringProduct[]> => {
    const { token } = await getAuthHeaders();

    const response = await fetch('https://regusto.azurewebsites.net/api/expiring', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw { status: response.status, message: response.statusText };
        // throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
};
export const fetchOrders = async (): Promise<Order[]> => {
    const { token } = await getAuthHeaders();

    const response = await fetch('https://regusto.azurewebsites.net/api/orders', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) {
        throw { status: response.status, message: response.statusText };
        // throw new Error('Failed to fetch orders');
    }
    return response.json();
};

export const fetchBaskets = async () => {
    const { token } = await getAuthHeaders();

    const response = await fetch('https://regusto.azurewebsites.net/api/basket', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        }
    });
    if (!response.ok) {
        throw { status: response.status, message: response.statusText };
        // throw new Error('Failed to fetch baskets');
    }
    return await response.json();
}


