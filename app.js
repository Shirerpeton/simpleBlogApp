'use strict';

const bcrypt = require('bcryptjs');
const saltRounds = 8;

const mongoose = require('mongoose');
mongoose.set('useUnifiedTopology', true);
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useNewUrlParser', true);
mongoose.connect('mongodb://localhost/app');


const User = new Schema({
	login: {type: String, unique: true},
	password: String,
	date: {type: Date, default: Date.now}
});

const Blog = new Schema({
	blogId: ObjectId,
	author: {type: String, required: true},
	title: String,
	text: String,
	date: {type: Date, default: Date.now}
});

const userModel = mongoose.model('user', User);
const blogModel = mongoose.model('blog', Blog);

const yup = require('yup');
const signupSchema = yup.object().shape({
	login: yup.string().required('Login must not be empty'),
	password: yup.string().min(4, 'Passowrd must be at least 4 characters long').max(50, 'Password must be not more than 50 characters long').required('Password must not be empty'),
});

let loginSchema = yup.object().shape({
	login: yup.string().required('Enter login'),
	password: yup.string().required('Enter password')
});

const koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const session = require('koa-session');
const mongooseStore = require('./koa-session-mongoose');

const app = new koa();

app.keys = ['yetanotherverystupidandverysimplesecret'];

app.use(session({store: new mongooseStore()}, app));
//app.use(session(app));

app.use(bodyParser());

const router = Router();

router.post('/login', async (ctx, next) => {
	console.log('login request');
	if (ctx.session.login === ctx.request.body.login) {
		ctx.body = {status: 'ok', login: ctx.session.login};
		return;
	}
	if (ctx.session.login != null) {
		ctx.response.status = 400;
		ctx.body = {status: 'error', msg: 'You are already logged in as ' + ctx.session.login, login: ctx.session.login};
		return;
	}
	try {
		await loginSchema.validate(ctx.request.body);
	} catch(err) {
		ctx.response.status = 400;
		ctx.body = {status: 'error', msg: 'Invalid request: ' + err.message};
		return;
	}
	const login = ctx.request.body.login;
	const result = await userModel.findOne({login: login}).exec();
	if (result === null) {
		ctx.response.status = 400;
		ctx.body = {status: 'error', msg: 'Wrong login'};
		return;
	}
	try {
		var comparison = await bcrypt.compare(ctx.request.body.password, result.password);
	} catch(err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error', msg: 'Internal server error'};
		return;
	}
	if (!comparison) {
		ctx.response.status = 400;
		ctx.body = {status: 'error', msg: 'Wrong password'};
		return;
	}
	ctx.session.login = login;
	ctx.body = {status: 'ok', login: login};
});

router.post('/signup', async (ctx, next) => {
	console.log('signup request');
	if (ctx.session.login != null) {
		ctx.response.status = 400;
		ctx.body = {status: 'error', msg: 'You are already logged in', login: ctx.session.login};
		return;
	}
	try {
		await signupSchema.validate(ctx.request.body);
	} catch(err) {
		ctx.response.status = 400;
		ctx.body = {status: 'error', msg: 'Invalid request: ' + err.message};
		return;
	}
	const login = ctx.request.body.login;
	const result = await userModel.findOne({login: login}).exec();
	if (result != null) {
		ctx.response.status = 400;
		ctx.body = {status: 'error', msg: 'User with such login already exists'};
		return;
	} else {
		try {
			var hash = await bcrypt.hash(ctx.request.body.password, saltRounds);
		} catch(err) {
			ctx.response.status = 500;
			ctx.body = {status: 'error', msg: 'Internal server error'};
			return;
		}
		await new userModel({login: login, password: hash}).save();
	}
	ctx.body = {status: 'ok'};
});

router.get('/logout', async (ctx) => {
	console.log('logout request');
	if (ctx.session.login === null) {
		ctx.response.status = 400;
		ctx.body = {status: 'error', msg: 'You are not logged in'};
		return;
	}
	ctx.session.login = null;
	ctx.body = {status: 'ok'};
});

router.get('/blogs/page/:page', async (ctx) => {
	const page = ctx.params.page;
	console.log('blogs request for page ' + page);
	const result = await blogModel.find({}).sort('-date').select('-_id').exec();
	const lastpage = Math.ceil(result.length / 10);
	const responsePage = page > lastpage ? lastpage : page;
	const blogs = result.slice((responsePage - 1) * 10, responsePage * 10);
	ctx.body = {status: 'ok', blogs: blogs, lastpage: lastpage};
});



router.post('/blogs', async (ctx) => {
	console.log('create blog request')
	if (ctx.session.login === null) {
		ctx.response.status = 400;
		ctx.body = {status: 'error', msg: 'You are not logged in'};
		return;
	}
	await new blogModel({author: ctx.session.login, title: ctx.request.body.title, text: ctx.request.body.text}).save();
	ctx.body = {status: 'ok'};
});

app.use(router.routes());

app.listen(3001);