


export interface Restaurante {
    id: string;
    name: string;
    category: string;
    phone: string;
    rating: number;
    logo: string;
    isFavorite: boolean;
}

export interface Product {
    id: string;
    name: string;
    price: number;
    discount?: number;
    description: string;
    category: string;
    stock: number;
    state: string;
    commerce_id: string;
    isFavorite?: boolean;
    photo: string;
}


export interface ProductInstance {
    product_instance: string;
    quantity: number;
    discount: number;
    price: number;
}

export interface CartItem {
    price: number;
    quantity: number;
    product_instance: string;
    name: string;
    expiration_date: string;
    photo: string;
}