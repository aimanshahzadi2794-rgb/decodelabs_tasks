const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let products = [];
let nextProductId = 1;

let cart = [];
let nextCartId = 1;

products.push(
    { id: nextProductId++, name: "Fresh Apples (1 dozen)", price: 200, category: "Fruits", stock: 50 },
    { id: nextProductId++, name: "Fresh Milk (1 pack)", price: 180, category: "Dairy", stock: 30 },
    { id: nextProductId++, name: "Wheat Bread (1 packet)", price: 120, category: "Bakery", stock: 20 },
    { id: nextProductId++, name: "Eggs (1 dozen)", price: 400, category: "Dairy", stock: 60 },
    { id: nextProductId++, name: "Basmati Rice (1 kg)", price: 400, category: "Grains", stock: 40 },
    { id: nextProductId++, name: "Tomatoes (1 kg)", price: 80, category: "Vegetables", stock: 35 },
    { id: nextProductId++, name: "Chicken Breast (1 kg)", price: 999, category: "Meat", stock: 25 },
    { id: nextProductId++, name: "Orange Juice", price: 120, category: "Beverages", stock: 45 }
);

function updateProductStock(productId, quantityChange) {
    const product = products.find(p => p.id === productId);
    if (product) {
        product.stock += quantityChange;
        return true;
    }
    return false;
}

app.get('/api/products', (req, res) => {
    res.status(200).json(products);
});

app.get('/api/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const product = products.find(p => p.id === id);
    
    if (!product) {
        return res.status(404).json({ error: 'Product not found' });
    }
    
    res.status(200).json(product);
});

app.post('/api/products', (req, res) => {
    const { name, price, category, stock } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'Product name is required' });
    }
    
    if (!price || price <= 0) {
        return res.status(400).json({ error: 'Valid price is required' });
    }
    
    if (!category) {
        return res.status(400).json({ error: 'Category is required' });
    }
    
    const newProduct = {
        id: nextProductId++,
        name: name,
        price: parseFloat(price),
        category: category,
        stock: parseInt(stock) || 0
    };
    
    products.push(newProduct);
    res.status(201).json(newProduct);
});

app.put('/api/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { name, price, category, stock } = req.body;
    
    const product = products.find(p => p.id === id);
    
    if (!product) {
        return res.status(404).json({ error: 'Product not found' });
    }
    
    if (name !== undefined) product.name = name;
    if (price !== undefined) product.price = parseFloat(price);
    if (category !== undefined) product.category = category;
    if (stock !== undefined) product.stock = parseInt(stock);
    
    res.status(200).json(product);
});

app.delete('/api/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = products.findIndex(p => p.id === id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Product not found' });
    }
    
    products.splice(index, 1);
    res.status(204).send();
});

app.get('/api/cart', (req, res) => {
    res.status(200).json(cart);
});

app.post('/api/cart', (req, res) => {
    const { productId, quantity } = req.body;
    
    if (!productId) {
        return res.status(400).json({ error: 'Product ID is required' });
    }
    
    if (!quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Valid quantity is required' });
    }
    
    const product = products.find(p => p.id === productId);
    if (!product) {
        return res.status(404).json({ error: 'Product not found' });
    }
    
    if (product.stock < quantity) {
        return res.status(400).json({ error: `Only ${product.stock} items available` });
    }
    
    product.stock -= quantity;
    
    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.total = existingItem.price * existingItem.quantity;
        res.status(200).json(existingItem);
    } else {
        const newCartItem = {
            id: nextCartId++,
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: quantity,
            total: product.price * quantity
        };
        cart.push(newCartItem);
        res.status(201).json(newCartItem);
    }
});

app.put('/api/cart/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { quantity } = req.body;
    
    const cartItem = cart.find(item => item.id === id);
    
    if (!cartItem) {
        return res.status(404).json({ error: 'Cart item not found' });
    }
    
    if (!quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Valid quantity is required' });
    }
    
    const product = products.find(p => p.id === cartItem.productId);
    const quantityDifference = quantity - cartItem.quantity;
    
    if (quantityDifference > 0 && product.stock < quantityDifference) {
        return res.status(400).json({ error: `Only ${product.stock} more items available` });
    }
    
    product.stock -= quantityDifference;
    
    cartItem.quantity = quantity;
    cartItem.total = cartItem.price * quantity;
    
    res.status(200).json(cartItem);
});

app.delete('/api/cart/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const cartItem = cart.find(item => item.id === id);
    
    if (!cartItem) {
        return res.status(404).json({ error: 'Cart item not found' });
    }
    
    const product = products.find(p => p.id === cartItem.productId);
    if (product) {
        product.stock += cartItem.quantity;
    }
    
    const index = cart.findIndex(item => item.id === id);
    cart.splice(index, 1);
    res.status(204).send();
});

app.delete('/api/cart', (req, res) => {
    cart.forEach(cartItem => {
        const product = products.find(p => p.id === cartItem.productId);
        if (product) {
            product.stock += cartItem.quantity;
        }
    });
    
    cart = [];
    res.status(204).send();
});

app.post('/api/cart/checkout', (req, res) => {
    if (cart.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
    }
    
    const orderSummary = {
        items: [...cart],
        total: cart.reduce((sum, item) => sum + item.total, 0),
        orderDate: new Date().toISOString(),
        itemCount: cart.reduce((sum, item) => sum + item.quantity, 0)
    };
    
    cart = [];
    
    res.status(200).json({ message: 'Order placed successfully!', order: orderSummary });
});

app.get('/api/cart/total', (req, res) => {
    const total = cart.reduce((sum, item) => sum + item.total, 0);
    res.status(200).json({ total: total.toFixed(2) });
});

app.listen(3000, () => {
    console.log('Shopping API Server running on http://localhost:3000');
    console.log('Available endpoints:');
    console.log('   GET    /api/products     - View all products');
    console.log('   POST   /api/products     - Add new product');
    console.log('   GET    /api/cart         - View cart');
    console.log('   POST   /api/cart         - Add to cart (reduces stock)');
    console.log('   PUT    /api/cart/:id     - Update quantity (adjusts stock)');
    console.log('   DELETE /api/cart/:id     - Remove from cart (returns stock)');
    console.log('   DELETE /api/cart         - Clear cart (returns stock)');
    console.log('   POST   /api/cart/checkout - Checkout (empties cart)');
});