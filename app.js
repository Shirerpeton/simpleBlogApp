'use strict';

const moment = require('moment');

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
	date: {type: Date, default: Date.now},
	id: String
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
	try {
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
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

router.post('/signup', async (ctx, next) => {
	try {
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
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

router.get('/logout', async (ctx) => {
	try {
		console.log('logout request');
		if (ctx.session.login === null) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are not logged in'};
			return;
		}
		ctx.session.login = null;
		ctx.body = {status: 'ok'};
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

router.get('/blogs/page/:page', async (ctx) => {
	try {
		const page = ctx.params.page;
		console.log('blogs request for page ' + page);
		const result = await blogModel.find({}).sort('-date').select('-_id').exec();
		const lastpage = Math.ceil(result.length / 10);
		const responsePage = page > lastpage ? lastpage : page;
		const blogs = result.slice((responsePage - 1) * 10, responsePage * 10);
		ctx.body = {status: 'ok', blogs: blogs, lastpage: lastpage};
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

router.post('/blogs', async (ctx) => {
	try {
		console.log('create blog request')
		if (ctx.session.login === null) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are not logged in'};
			return;
		}
		const author = ctx.session.login;
		const title = ctx.request.body.title;
		const date = new Date();
		const id = author + '/' + (moment(date).format('YYYY/MM/DD') + '/' + title).toLowerCase().replace(/ /g, '-');
		await new blogModel({author: author, title: title, text: ctx.request.body.text, date: date, id: id}).save();
		console.log('new blog post: ' + id);
		ctx.body = {status: 'ok'};
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

router.get('/blog/:author/:year/:month/:day/:blogtitle', async(ctx) => {
	try {
		const day = ctx.params.day;
		const month = ctx.params.month;
		const year = ctx.params.year;
		const blogtitle = ctx.params.blogtitle;
		const author = ctx.params.author;
		const id = author + '/' + year + '/' + month + '/' + day + '/' + blogtitle;
		console.log('request for blog ' + id);
		let result = await blogModel.find({id: id}).select('-_id').exec();
		if (result.length === 1) {
			result = result[0];
			ctx.body = {status: 'ok', author: result.author, title: result.title, text: result.text, date: result.date, id: result.id};
		}
		return;
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

app.use(router.routes());

app.listen(3001);