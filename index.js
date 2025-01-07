require('dotenv').config();
require('express-async-errors');
//express
const express = require('express');
const app = express();

// rest of the packages
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

//database
const connectDB = require('./config/connectDB');

//routers
const authRouter = require('./routers/auth');

//midlleware
const notFoundMiddleware = require('./middleware/not-found')
const erorHandlerMiddleware = require('./middleware/eror-handler')

//app
app.use(morgan('tiny'));
app.use(express.json());
app.use(cookieParser(process.env.JWT_SECRET_KEY));

app.use(express.static('./public'));

app.use(express.urlencoded({ extended: true }));

app.use('/v1/auth', authRouter);

app.use(notFoundMiddleware);
app.use(erorHandlerMiddleware);

const port = process.env.PORT || 5003

const start = async () => {
    try {
        await connectDB(process.env.MONGO_URL)
        app.listen(port,
            console.log(`MongoDb Connection Successful,App started on port ${port} : ${process.env.NODE_ENV}`),
        );
    } catch (error) {
        console.log(error);
    }
};

start();