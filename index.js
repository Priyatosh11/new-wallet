const express = require('express');
const cookieParser = require('cookie-parser');
const userRoutes = require('./routes/user').router;
const productRoutes = require('./routes/product');
const app = express();

app.use(express.json());
app.use(cookieParser());

app.use('/user', userRoutes);
app.use('/product', productRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
