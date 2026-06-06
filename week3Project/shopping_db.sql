CREATE database shopping_db;
USE shopping_db;

CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cart (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    total DECIMAL(10,2) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

INSERT INTO products (name, price, category, stock) VALUES
('Fresh Apples (1 kg)', 200, 'Fruits', 50),
('Fresh Milk (1 liter)', 180, 'Dairy', 30),
('Wheat Bread (1 packet)', 120, 'Bakery', 20),
('Eggs (1 dozen)', 400, 'Dairy', 60),
('Basmati Rice (1 kg)', 400, 'Grains', 40),
('Fresh Tomatoes (1 kg)', 80, 'Vegetables', 35),
('Chicken Breast (1 kg)', 999, 'Meat', 25),
('Orange Juice', 120, 'Beverages', 45);