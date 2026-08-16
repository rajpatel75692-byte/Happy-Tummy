require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { buildUserRecord, normalizeProviderName, updateProfileFields } = require('./accountStore');

const app = express();
app.use(cors());
app.use(express.json());
const SECRET = process.env.JWT_SECRET || 'happy-tummy-demo-secret';
const users = [
  buildUserRecord({
    name: 'Raj Kitchen',
    email: 'rajpatel75692@gmail.com',
    passwordHash: bcrypt.hashSync('raj123', 10),
  }),
];

const MenuItem = mongoose.model('MenuItem', new mongoose.Schema({ name:String, category:String, price:Number, description:String, available:{type:Boolean,default:true}, image:String }, { timestamps:true }));
const Order = mongoose.model('Order', new mongoose.Schema({ customer:String, items:Number, total:Number, status:String, time:String }, { timestamps:true }));
let memoryMenu = [
  { _id:'m1', name:'Smoky Paneer Bowl', category:'Main course', price:249, description:'Charred paneer, herbed rice and seasonal greens.', available:true, image:'🥗' },
  { _id:'m2', name:'Truffle Mushroom Pasta', category:'Pasta', price:329, description:'Creamy sauce, wild mushrooms, parmesan.', available:true, image:'🍝' },
  { _id:'m3', name:'Mango Cheesecake', category:'Dessert', price:169, description:'Silky mango cream on a biscuit crust.', available:false, image:'🍰' },
  { _id:'m4', name:'Citrus Cooler', category:'Beverages', price:99, description:'Fresh orange, lime and mint.', available:true, image:'🍹' }
];
let memoryOrders = [
  { _id:'o1', customer:'Priya S.', items:3, total:647, status:'Preparing', time:'12 min ago' },
  { _id:'o2', customer:'Arjun K.', items:2, total:428, status:'Ready', time:'18 min ago' },
  { _id:'o3', customer:'Maya R.', items:4, total:896, status:'Delivered', time:'42 min ago' }
];
let memoryReviews = [
  { _id:'r1', customer:'Aisha M.', dish:'Smoky Paneer Bowl', rating:5, comment:'Loved the flavors and the portion size was perfect for a quick lunch.', date:'2 hours ago' },
  { _id:'r2', customer:'Rohan P.', dish:'Truffle Mushroom Pasta', rating:4, comment:'Rich and comforting. The mushroom sauce had a very fresh taste.', date:'Yesterday' },
  { _id:'r3', customer:'Naina K.', dish:'Mango Cheesecake', rating:5, comment:'The dessert was smooth, fresh, and exactly what we needed after dinner.', date:'2 days ago' },
  { _id:'r4', customer:'Kabir S.', dish:'Citrus Cooler', rating:4, comment:'Crisp and refreshing with a nice citrus kick. Great for summer.', date:'3 days ago' }
];
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
let dbReady = false;
let memoryServer;

const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
      });
      dbReady = true;
      console.log('MongoDB connected');
      return true;
    } catch (error) {
      console.warn('Configured MongoDB unavailable, falling back to local memory DB:', error.message);
    }
  }

  try {
    memoryServer = await MongoMemoryServer.create();
    const localUri = memoryServer.getUri();
    await mongoose.connect(localUri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    });
    dbReady = true;
    console.log('MongoDB connected via local memory server');
    return true;
  } catch (error) {
    dbReady = false;
    console.warn('MongoDB unavailable; using demo data:', error.message);
    return false;
  }
};

const seedDefaultData = async () => {
  try {
    const menuCount = await MenuItem.countDocuments();
    if (menuCount === 0) {
      await MenuItem.insertMany(memoryMenu.map(({ _id, ...item }) => item));
    }

    const orderCount = await Order.countDocuments();
    if (orderCount === 0) {
      await Order.insertMany(memoryOrders.map(({ _id, ...order }) => order));
    }
  } catch (error) {
    console.warn('Seed data failed:', error.message);
  }
};

const ensureDbReady = async () => {
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  const ready = await connectToDatabase();
  if (ready) {
    await seedDefaultData();
  }
  return ready;
};

connectToDatabase().then(async (ready) => {
  if (ready) {
    await seedDefaultData();
  }
});
const auth = (req,res,next) => { try { req.user=jwt.verify((req.headers.authorization||'').replace('Bearer ',''),SECRET); next(); } catch { res.status(401).json({message:'Please sign in again.'}); } };

app.get('/api/health', async (_,res)=>{
  const connected = mongoose.connection.readyState === 1;
  res.json({ok:true, mode:connected?'mongodb':'demo', connected});
});
app.post('/api/auth/signup', async (req,res) => {
  const name = normalizeProviderName(req.body.name);
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  if (users.some(user => user.email === email)) {
    return res.status(409).json({ message: 'An account already exists with this email.' });
  }

  const newUser = buildUserRecord({
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
  });

  users.push(newUser);

  const token = jwt.sign({ email: newUser.email, name: newUser.providerName }, SECRET, { expiresIn: '7d' });
  res.status(201).json({
    token,
    user: { name: newUser.providerName, providerName: newUser.providerName, email: newUser.email },
  });
});
app.post('/api/auth/login', async (req,res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = users.find(item => item.email === email);

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = jwt.sign({ email: user.email, name: user.providerName }, SECRET, { expiresIn: '7d' });
  res.json({ token, user: { name: user.providerName, providerName: user.providerName, email: user.email } });
});
app.get('/api/profile', auth, async (req,res) => {
  const user = users.find(item => item.email === req.user.email);
  if (!user) return res.status(404).json({ message: 'Profile not found.' });
  res.json({ name: user.providerName, providerName: user.providerName, email: user.email });
});
app.patch('/api/profile', auth, async (req,res) => {
  const userIndex = users.findIndex(item => item.email === req.user.email);
  if (userIndex === -1) return res.status(404).json({ message: 'Profile not found.' });

  const name = normalizeProviderName(req.body.name || users[userIndex].providerName);
  const email = String(req.body.email || users[userIndex].email || '').trim().toLowerCase();
  const password = req.body.password ? String(req.body.password) : null;

  if (!name || !email) return res.status(400).json({ message: 'Name and email are required.' });
  if (password && password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters long.' });

  const emailTaken = users.some((item, index) => index !== userIndex && item.email === email);
  if (emailTaken) return res.status(409).json({ message: 'An account already exists with this email.' });

  const updatedUser = updateProfileFields(users[userIndex], {
    name,
    email,
    passwordHash: password ? bcrypt.hashSync(password, 10) : users[userIndex].passwordHash,
  });

  users[userIndex] = updatedUser;

  const payload = { name: updatedUser.providerName, providerName: updatedUser.providerName, email: updatedUser.email };
  res.json(payload);
});
app.get('/api/dashboard', auth, async (_,res)=>{
  const useMongo = await ensureDbReady();
  const orders=useMongo?await Order.find().lean():memoryOrders;
  const menu=useMongo?await MenuItem.find().lean():memoryMenu;
  const reviews = memoryReviews;
  res.json({ stats:{ revenue:orders.reduce((s,o)=>s+o.total,0), orders:orders.length, active:orders.filter(o=>o.status==='Preparing').length, rating:4.8 }, orders, menu, reviews, demo:!useMongo });
});
app.get('/api/menu', auth, async (_,res)=>{ const useMongo = await ensureDbReady(); res.json(useMongo?await MenuItem.find().sort('-createdAt'):memoryMenu); });
app.post('/api/menu', auth, async (req,res)=>{ const item={...req.body, price:Number(req.body.price), available:true, image:req.body.image||'🍽️'}; const useMongo = await ensureDbReady(); if(useMongo)return res.status(201).json(await MenuItem.create(item)); item._id='m'+Date.now(); memoryMenu.unshift(item); res.status(201).json(item); });
app.patch('/api/menu/:id', auth, async (req,res)=>{ const useMongo = await ensureDbReady(); if(useMongo) return res.json(await MenuItem.findByIdAndUpdate(req.params.id,req.body,{new:true})); const i=memoryMenu.findIndex(x=>x._id===req.params.id); if(i<0)return res.status(404).end(); memoryMenu[i]={...memoryMenu[i],...req.body}; res.json(memoryMenu[i]); });
app.patch('/api/orders/:id', auth, async (req,res)=>{ const useMongo = await ensureDbReady(); if(useMongo)return res.json(await Order.findByIdAndUpdate(req.params.id,req.body,{new:true})); const i=memoryOrders.findIndex(x=>x._id===req.params.id); if(i<0)return res.status(404).end(); memoryOrders[i]={...memoryOrders[i],...req.body}; res.json(memoryOrders[i]); });
app.listen(process.env.PORT||5000,()=>console.log('Happy Tummy API running on port '+(process.env.PORT||5000)));
