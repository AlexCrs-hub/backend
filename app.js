const bodyParser = require('body-parser');
const express = require('express');
const { createServer } = require('http');

const errorController = require('./controllers/error');
const authRoutes = require('./routes/auth.routes');
const machineRoutes = require('./routes/machine.routes');
const linesRoutes = require('./routes/line.routes');
const sensorRoutes = require('./routes/sensor.routes');
const readingRoutes = require('./routes/reading.routes');
const connectDB = require('./database/connectDB');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');

dotenv.config();

const PORT = process.env.PORT;

const app = express();
const server = createServer(app);


app.use(cors({
    origin: 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.options('*', cors());

app.use(bodyParser.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/lines', linesRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/readings', readingRoutes);

app.use(errorController.get404);


server.listen(PORT, () => {
    connectDB();
    console.log(`Server is running on port ${PORT}`);
});

