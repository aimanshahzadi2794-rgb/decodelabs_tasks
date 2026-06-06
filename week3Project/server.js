const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',  
    database: 'shopping_db',
    port: 3307
});

db.connect((err) => {
    if (err) {
        console.error('MySQL Error:', err.message);
        return;
    }
    console.log('Connected to MySQL on port 3307');
});

function query(sql, params) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

app.get('/test', (req, res) => {
    res.json({ message: 'Server is working!', time: new Date() });
});

app.get('/api/products', async (req, res) => {
    try {
        const products = await query("SELECT * FROM products");
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const products = await query("SELECT * FROM products WHERE id = ?", [req.params.id]);
        if (products.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(products[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    const { name, price, category, stock } = req.body;
    
    if (!name || !price || !category) {
        return res.status(400).json({ error: 'Missing fields' });
    }
    
    try {
        const result = await query(
            "INSERT INTO products (name, price, category, stock) VALUES (?, ?, ?, ?)",
            [name, price, category, stock || 0]
        );
        const newProduct = await query("SELECT * FROM products WHERE id = ?", [result.insertId]);
        res.status(201).json(newProduct[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/products/:id', async (req, res) => {
    const { name, price, category, stock } = req.body;
    const id = req.params.id;
    
    try {
        await query(
            "UPDATE products SET name = ?, price = ?, category = ?, stock = ? WHERE id = ?",
            [name, price, category, stock, id]
        );
        const updated = await query("SELECT * FROM products WHERE id = ?", [id]);
        if (updated.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(updated[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await query("DELETE FROM cart WHERE product_id = ?", [req.params.id]);
        
        const result = await query("DELETE FROM products WHERE id = ?", [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/cart', async (req, res) => {
    try {
        const cart = await query("SELECT * FROM cart");
        res.json(cart);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/cart', async (req, res) => {
    const { productId, quantity } = req.body;
    
    try {
        const products = await query("SELECT * FROM products WHERE id = ?", [productId]);
        if (products.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        const product = products[0];
        if (product.stock < quantity) {
            return res.status(400).json({ error: `Only ${product.stock} available` });
        }
        
        await query("UPDATE products SET stock = stock - ? WHERE id = ?", [quantity, productId]);
        
        const existing = await query("SELECT * FROM cart WHERE product_id = ?", [productId]);
        
        if (existing.length > 0) {
            await query("UPDATE cart SET quantity = quantity + ?, total = price * (quantity + ?) WHERE product_id = ?", 
                [quantity, quantity, productId]);
            const updated = await query("SELECT * FROM cart WHERE product_id = ?", [productId]);
            res.json(updated[0]);
        } else {
            const result = await query(
                "INSERT INTO cart (product_id, name, price, quantity, total) VALUES (?, ?, ?, ?, ?)",
                [productId, product.name, product.price, quantity, product.price * quantity]
            );
            const newItem = await query("SELECT * FROM cart WHERE id = ?", [result.insertId]);
            res.status(201).json(newItem[0]);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/cart/:id', async (req, res) => {
    const cartId = req.params.id;
    const { quantity } = req.body;
    
    try {
        const cartItems = await query("SELECT * FROM cart WHERE id = ?", [cartId]);
        if (cartItems.length === 0) {
            return res.status(404).json({ error: 'Cart item not found' });
        }
        
        const cartItem = cartItems[0];
        const diff = quantity - cartItem.quantity;
        
        const products = await query("SELECT * FROM products WHERE id = ?", [cartItem.product_id]);
        if (products[0].stock < diff) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }
        
        await query("UPDATE products SET stock = stock - ? WHERE id = ?", [diff, cartItem.product_id]);
        await query("UPDATE cart SET quantity = ?, total = price * ? WHERE id = ?", [quantity, quantity, cartId]);
        
        const updated = await query("SELECT * FROM cart WHERE id = ?", [cartId]);
        res.json(updated[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/cart/:id', async (req, res) => {
    try {
        const cartItems = await query("SELECT * FROM cart WHERE id = ?", [req.params.id]);
        if (cartItems.length > 0) {
            const item = cartItems[0];
            await query("UPDATE products SET stock = stock + ? WHERE id = ?", [item.quantity, item.product_id]);
            await query("DELETE FROM cart WHERE id = ?", [req.params.id]);
        }
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/cart/checkout', async (req, res) => {
    try {
        const cartItems = await query("SELECT * FROM cart");
        const total = cartItems.reduce((sum, item) => sum + item.total, 0);
        await query("DELETE FROM cart");
        res.json({ message: 'Order placed!', order: { total: total } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => {
    console.log('Server on http://localhost:3000');
    console.log('Connected to MySQL');
});