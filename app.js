const dotenv = require('dotenv');
dotenv.config();
const bodyParser = require('body-parser');
const express = require('express');
const https = require('https');
const { createServer } = require('http');

const errorController = require('./controllers/error');
const authRoutes = require('./routes/auth.routes');
const machineRoutes = require('./routes/machine.routes');
const linesRoutes = require('./routes/line.routes');
const sensorRoutes = require('./routes/sensor.routes');
const readingRoutes = require('./routes/reading.routes');
const metricsRoutes = require('./routes/metrics.routes');
const downtimeRecordRoutes = require('./routes/downtimeRecord.routes');
const userRoutes = require('./routes/user.routes');
const workIntervalRoutes = require('./routes/workInterval.routes');
const notificationGroupRoutes = require('./routes/notificationGroup.routes');
const connectDB = require('./database/connectDB');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const fs = require("fs");
const { checkEscalations } = require('./services/notification.service');

const PORT = process.env.PORT;

const app = express();
// Uncomment the following lines to use HTTPS
// const options = {
//     key: fs.readFileSync("server.key"),
//     cert: fs.readFileSync("server.cert"),
// };
// const server = https.createServer(options, app);

// For development, use HTTP server
const server = createServer(app);

app.use(cors({
    origin: ['http://localhost:5173', 'https://predictech.org', 'https://www.predictech.org'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

//Comment this when using https
app.options('*', cors());

app.use(bodyParser.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/lines', linesRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/work-intervals', workIntervalRoutes);
app.use('/api/users', userRoutes);
app.use('/api/downtime-records', downtimeRecordRoutes);
app.use('/api/notification-groups', notificationGroupRoutes);
app.use(errorController.get404);

server.listen(PORT, () => {
    connectDB();
    setInterval(checkEscalations, 60 * 1000);
    console.log(`Server is running on port ${PORT}`);
});

