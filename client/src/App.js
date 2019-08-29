import React from 'react';
import './App.css';
import {BrowserRouter as Router, Route, NavLink, Switch, Link} from "react-router-dom";
import {Formik, Form, Field, ErrorMessage} from 'formik';
import * as yup from 'yup';
import * as cookies from 'js-cookie'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleUp, faAngleDown, faPen } from "@fortawesome/free-solid-svg-icons";
import onClickOutside from "react-onclickoutside";


const axios = require('axios');
const moment = require('moment');

let signupSchema = yup.object().shape({
	login: yup.string().required('Enter login'),
	password: yup.string().required('Enter password').min(4, 'Passowrd must be at least 4 characters long').max(50, 'Password must be not more than 50 characters long'),
	repeatPassword: yup.string().oneOf([yup.ref('password'), null], "Passwords must match").required('Repeat password'),
});

let loginSchema = yup.object().shape({
	login: yup.string().required('Enter login'),
	password: yup.string().required('Enter password')
});

class App extends React.Component {
	constructor(props) {
		super(props);
		this.state = {loggedIn: cookies.get('login') && true};
		this.logInHandle = this.logInHandle.bind(this);
		this.logOutHandle = this.logOutHandle.bind(this);
	}
	
	logInHandle(login) {
		cookies.set('login', login, { expires: 1 });
		this.setState({loggedIn: true});
	}
	
	async logOutHandle() {
		this.setState({loggedIn: false});
		try {
			var response = await axios.get('/logout');
		} catch(err) {
			console.log(err.response.data.msg);
			switch(err.response.data.msg) {
				case('You are not logged in'):
					cookies.remove('login');
					break;
				default:
					break;
			}
			return;
		}
		if (response.data.status === 'ok') {
			cookies.remove('login');
			return;
		}
	}
	
	render() {
		return (
			<Router>
				<div className="App">
					<NavBar 
						left={[
							<NavLink to="/page/1" className="nav-link" location={{pathname: '/' + window.location.href.split('/').slice(-2, -1).join('/') + '/1'}} activeClassName="activeBtn">
								Home
							</NavLink>,
							<NavLink exact to="/users" className="nav-link" activeClassName="activeBtn">
								Users
							</NavLink>,
							<NavLink to="/about" className="nav-link" activeClassName="activeBtn">
								About
							</NavLink>]}
						right={!(this.state.loggedIn) ?
								[<SignUpBtn />, <LogInBtn />]
							:
								[<DropDownBtn title={cookies.get('login')} className='profile-btn' list={[<LogOutBtn logOutHandle={this.logOutHandle} />]} />]
							}
					/>
						<Switch>
							<Route path='/login' render={(props) => <LogInForm {...props} logInHandle={this.logInHandle} />} />
							<Route path='/signup' render={(props) => <SignUpForm {...props} logInHandle={this.logInHandle} />}/>
							<Route path='/page/' component={BlogViewer} />
							<Route exact path='/new' component={NewBlogForm} />
						</Switch>
				</div>
			</Router>
		);
	}
}

function CustomErrorMessage(props) {
		 const result = (props.errors && props.errors[props.name]) ?
			<div className={props.className}>
				{props.errors[props.name]}
			</div>
			: null;
		return(result);
}

class SignUpForm extends React.Component {
	constructor(props) {
		super(props);
		this.state = {login: '', password: '', repeatPassword: ''};
		
		this.handleInputChange = this.handleInputChange.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
	}
	
	handleInputChange(event) {
		this.setState({[event.target.name]: event.target.value});
	}
	
	async handleSubmit(values, {setErrors}) {
		try {
			var response = await axios.post('/signup', {
				login: values.login,
				password: values.password
			})
		} catch(err) {
			console.log(err.response.data.msg);
			switch(err.response.data.msg) {
				case('User with such login already exists'):
					setErrors({'login': 'User with such login already exists'});
					break;
				case('You are already logged in'):
					setErrors({'submit': 'You are already logged in'});
					this.props.logInHandle(err.response.data.login);
					break;
				default:
					setErrors({'submit': 'Error occured while submitting: ' + err.response.data.msg});
					break;
			}
			return;
		}
		if (response.data.status === 'ok') {
			this.props.history.push('/login');
			return;
		}
	}
	
	render() {
		return (
			<Formik
				initialValues={{login: '', password: '', repeatPassword: ''}}
				onSubmit={this.handleSubmit}
				validationSchema={signupSchema}
			>
				{({errors, touched}) => (
					<Form className='form'>
						<label htmlFor='login' className='input-label'>Login</label>
						<Field className='input-field' name='login'/>
						<ErrorMessage name="login" component='div' className='error-msg'/>
						<label htmlFor='password' className='input-label'>Password</label>
						<Field name='password' className='input-field' type='password'/>
						<ErrorMessage name="password" component='div' className='error-msg'/>
						<label htmlFor='repeatPassword' className='input-label'>Repeat password</label>
						<Field name='repeatPassword' className='input-field' type='password'/>
						<ErrorMessage name="repeatPassword" component='div' className='error-msg'/>
						<button type="submit" className='submit-btn'>
							Submit
						</button>
						<CustomErrorMessage name="submit" className='error-msg' errors={errors} />
					</Form>
				)}
			</Formik>
		);
	}
}

class LogInForm extends React.Component {
	constructor(props) {
		super(props);
		this.state = {login: '', password: ''};
		
		this.handleInputChange = this.handleInputChange.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
	}
	
	handleInputChange(event) {
		this.setState({[event.target.name]: event.target.value});
	}
	
	async handleSubmit(values, {setErrors}) {
		try {
			var response = await axios.post('/login', {
				login: values.login,
				password: values.password
			})
		} catch(err) {
			console.log(err.response.data.msg);
			switch(err.response.data.msg) {
				case('Wrong login'):
					setErrors({'login': 'Wrong login'});
					break;
				case('Wrong password'):
					setErrors({'password': 'Wrong password'});
					break;
				default:
					setErrors({'submit': 'Error occured while submitting: ' + err.response.data.msg});
					break;
			}
			if (err.response.data.msg.startsWith('You are already logged in as ')) {
				this.props.logInHandle(err.response.data.login);
			}
			return;
		}
		if (response.data.status === 'ok') {
			this.props.logInHandle(response.data.login);
		}
		this.props.history.push('/');
	}
	
	render() {
		return (
			<Formik
				initialValues={{login: '', password: ''}}
				onSubmit={this.handleSubmit}
				validationSchema={loginSchema}
			>
				{({errors, touched}) => (
					<Form className='form'>
						<label htmlFor='login' className='input-label'>Login</label>
						<Field className='input-field' name='login'/>
						<ErrorMessage name="login" component='div' className='error-msg'/>
						<label htmlFor='password' className='input-label'>Password</label>
						<Field name='password' className='input-field' type='password'/>
						<ErrorMessage name="password" component='div' className='error-msg'/>
						<button name='submit' type="submit" className='submit-btn'>
							Submit
						</button>
						<CustomErrorMessage name="submit" className='error-msg' errors={errors} />
					</Form>
				)}
			</Formik>
		);
	}
}

class NewBlogForm extends React.Component {
	constructor(props) {
		super(props);
		this.handleSubmit = this.handleSubmit.bind(this);
	}
	
	async handleSubmit(values, {setErrors}) {
		try {
			await axios.post('/blogs', {
				title: values.title,
				text: values.text
			})
		} catch(err) {
			console.log(err.response.data.msg);
			if (err.response.data.msg === 'You are not logged in') {
				setErrors({'submit': 'Error occured while submitting: ' + err.response.data.msg});
			}
			return;
		}
		this.props.history.push('/page/1');
		return;
	}
	
	render() {
		return(
			<Formik
				initialValues={{title: '', text: ''}}
				onSubmit={this.handleSubmit}
			>
				{({errors, touched}) => (
					<Form className='blog-form'>
						<label htmlFor='title' className='input-label'>Title</label>
						<Field className='input-field' name='title'/>
						<ErrorMessage name="title" component='div' className='error-msg'/>
						<label htmlFor='text' className='input-label'>Text</label>
						<Field name='text' className='input-field-textarea' type='text' component='textarea'/>
						<ErrorMessage name="text" component='div' className='error-msg'/>
						<button name='submit' type="submit" className='submit-btn'>
							Submit
						</button>
						<CustomErrorMessage name="submit" className='error-msg' errors={errors} />
					</Form>
				)}
			</Formik>
		);
	}
}

class NavBar extends React.Component {
	render() {
		return (
			<ul className='navbar'>
				{this.props.left.map((elem, index) =>
					<li key={index}>
						{elem}
					</li>
				)}
				{this.props.right.map((elem, index) =>
					<li key={index} className='rightFloat'>
						{elem}
					</li>
				)}
			</ul>
		);
	}
}

class LogInBtn extends React.Component {
	render() {
		return(
			<NavLink to="/login" className="nav-link" activeClassName="activeBtn">
				Log in
			</NavLink>
		);
	}
}

class SignUpBtn extends React.Component {
	render() {
		return(
			<NavLink to="/signup" className="nav-link" activeClassName="activeBtn">
				Sign up
			</NavLink>
		);
	}
}

class LogOutBtn extends React.Component {
	render() {
		return(
			<button className="log-out-btn" onClick={this.props.logOutHandle}>Log out</button>
		);
	}
}

class DropDown extends React.Component {
	constructor(props) {
		super(props);
		this.state = {listOpen: false};
		this.toggleList = this.toggleList.bind(this);
	}
	
	handleClickOutside(){
		this.setState({
			listOpen: false
		});
	}
	
	toggleList() {
		this.setState(prevState => ({listOpen: !prevState.listOpen}));
	}
	
	render() {
		return(
			<div className={this.props.className}>
				<div className='dd-header' onClick={this.toggleList}>
					{this.props.title + ''}
					<div className='dd-arrow'>
						{this.state.listOpen ?
							<FontAwesomeIcon icon={faAngleUp}/>
						:
							<FontAwesomeIcon icon={faAngleDown}/>
						}
					</div>
					</div>
				{this.state.listOpen && 
					<ul className='dd-list'>
						{this.props.list.map((elem, index) =>
							<li key={index} className='dd-list-item'>
								{elem}
							</li>
						)}
					</ul>
				}
			</div>
		);
	}
}

class PageNav extends React.Component {
	render() {
		return(
			<div className='center page-nav'>
				<button className='page' onClick={this.props.firstPage}>
					{'<<'}
				</button>
				<button className='page' onClick={this.props.prevPage}>
					{'<'}
				</button>
				{this.props.page !== 1 && 
					<button className='page' onClick={this.props.prevPage}>
						{this.props.page-1}
					</button>
				}
				<button className='page active-page'>
					{this.props.page}
				</button>
				{this.props.page !== this.props.lastpage && 
					<button className='page' onClick={this.props.nextPage}>
						{this.props.page+1}
					</button>
				}
				<button className='page' onClick={this.props.nextPage}>
					{'>'}
				</button>
				<button className='page' onClick={this.props.lastPage}>
					{'>>'}
				</button>
			</div>
		);
	}
}

class BlogViewer extends React.Component {
	constructor(props){
		super(props);
		const page = parseInt(window.location.href.split('/').slice(-1)[0])
		this.state = {blogs: [], page: page, lastpage: page};
		this.firstPage = this.firstPage.bind(this);
		this.prevPage = this.prevPage.bind(this);
		this.nextPage = this.nextPage.bind(this);
		this.lastPage = this.lastPage.bind(this);
		this.updateContent = this.updateContent.bind(this);
	}
	
	firstPage(){
		if (this.state.page !== 1) {
			this.setState({page: 1})
			this.props.history.push('/page/1');
			this.updateContent();
		}
	}
	
	prevPage(){
		if (this.state.page > 1) {
			this.props.history.push('/page/' + (this.state.page - 1));
			this.setState((prevState) => ({page: prevState.page - 1}));
			this.updateContent();
		}
	}
	
	nextPage(){
		if (this.state.page < this.state.lastpage) {
			this.props.history.push('/page/' + (this.state.page + 1));
			this.setState((prevState) => ({page: prevState.page + 1}));
			this.updateContent();
		}
	}
	
	lastPage() {
		if (this.state.page !== this.state.lastpage) {
			this.props.history.push('/page/' + this.state.lastpage);
			this.setState((prevState) => ({page: prevState.lastpage}));
			this.updateContent();
		}
	}
	
	async updateContent() {
		try {
			var response = await axios.get('/blogs/' + window.location.href.split('/').slice(-2).join('/'));
		} catch(err) {
			console.log(err.response.data.msg);
		}
		const lastpage = response.data.lastpage;
		if (this.state.page > lastpage) {
			this.setState({blogs: response.data.blogs, page: lastpage, lastpage: lastpage});
			this.props.history.push('/page/' + lastpage);
		}
		else
			this.setState({blogs: response.data.blogs, lastpage: lastpage});
	}
	
	componentDidMount() {
		this.updateContent();
	}
	
	render(){
		return(
			<div className='blog-viewer'>
			<WriteBlogBtn />
			<PageNav page={this.state.page} lastpage={this.state.lastpage} firstPage={this.firstPage} prevPage={this.prevPage} nextPage={this.nextPage} lastPage={this.lastPage} />
				{this.state.blogs.map((blog, index) => 
					<Blog title={blog.title} text={blog.text} author={blog.author} date={moment(blog.date).format('DD/MM/YYYY')} key={blog._id}/>
				)}
			<PageNav page={this.state.page} lastpage={this.state.lastpage} firstPage={this.firstPage} prevPage={this.prevPage} nextPage={this.nextPage} lastPage={this.lastPage} />
			</div>
		);
	}
}

class WriteBlogBtn extends React.Component {
	
	handleClick(){
		this.props.history.push('/new');
	}
	
	render() {
		return(
			<div className='center'>
				<Link className='write-blog-btn' to='/new'>
					Write a blog post
					<FontAwesomeIcon icon={faPen} className='right-align' size='xs'/> 
				</Link>
			</div>
		);
	}
}

function Blog(props) {
	return(
		<div className='blog-post'>
			<h1 className='blog-title'>{props.title}</h1>
			<h4 className='blog-description'>Posted on {props.date} by {props.author}</h4>
			<div>
				{props.text}
			</div>
		</div>
	);
}

const DropDownBtn = onClickOutside(DropDown);

export default App;
