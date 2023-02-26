const express = require("express");
const ejs = require("ejs")
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const qr = require('qrcode');
const puppeteer = require('puppeteer');


////////////////////////////////////////////////////////////////////////////////////////
// create a storage engine for multer
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, 'uploads/');
    },
    filename: function(req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });
///////////////////////////////////////////////////////////////////////////////////////



const app = express();

app.set("view-engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));


// mongoose
mongoose.connect('mongodb://localhost:27017/Kartexa', { useNewUrlParser: true, useUnifiedTopology: true});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Database connected');
});
////////////////////////////////////////////////////////////////////////////



////////////////////////////////////////////////////////////////////////////
// SCHEMA
let Schema = mongoose.Schema;

let userSchema = new Schema({
    certificateNumber: {type: Number, required: true, unique: true},
    name: {type: String, required: true},
    role: {type: String, required: true},
    organization: {type: String, required: true},
    organizer: {type: String, required: true},
    startDate: {type: Date},
    endDate: {type: Date},
    profilePicture: {type: String, required: true}
});


let User = mongoose.model('certificate', userSchema);
///////////////////////////////////////////////////////////////////////////////////


//////////////////  CREATE CERTIFICATE  ////////////////////////////////////////////////////////////////
app.post('/', upload.single('profilePicture'), (req, res) => {
  let certificateNumber = req.body.certificateNumber;
  let name = req.body.name;
  let role = req.body.role;
  let organization = req.body.organization;
  let organizer = req.body.organizer;
  let startDate = req.body.startDate;
  let endDate = req.body.endDate;
  let profilePicture = '/uploads/' + req.file.filename;
  
  const user = new User({
    certificateNumber: certificateNumber,
    name : name,
    role: role,
    organization: organization,
    organizer: organizer,
    startDate: startDate,
    endDate: endDate,
    profilePicture: profilePicture
  });

  user.save((err, user) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error saving user!');
    } else {
      console.log('Successfully added!');
      
      // Generate QR code
      let url = 'https://studentCertificate/' + certificateNumber;
      qr.toDataURL(url, function(err, dataUrl) {
        if (err) {
          console.log(err);
          res.status(500).send('Error generating QR code!');
        } else {
          // Redirect to the certificate page with the necessary data
          res.redirect('/yourCertificate?'+ 'certificateNumber=' + certificateNumber + '&name=' + name + '&role=' + role + '&organization=' + organization + '&organizer=' + organizer + '&startDate=' + startDate + '&endDate=' + endDate + '&qrCodeImageUrl=' + encodeURIComponent(dataUrl));
        }
      });
    }
  });
});

app.get("/yourCertificate" ,function(req, res){
  let certificateNumber = req.query.certificateNumber;
  let name = req.query.name;
  let role = req.query.role;
  let organization = req.query.organization;
  let organizer = req.query.organizer;
  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let qrCodeImageUrl = decodeURIComponent(req.query.qrCodeImageUrl);

  res.render("yourCertificate.ejs", {qrCodeImageUrl: qrCodeImageUrl, certificateNumber: certificateNumber, name: name, role: role, organization: organization, organizer: organizer, startDate: startDate, endDate: endDate});
});
///////////////////////////////////////////////////////////////////////////////////




///////////////////////////////////////////////////////////////////////////////////
// ROUTE PARAMETER TO GET DETAILS OF THE CANDIDATE  ///////////////////////////////
///////////////////////////////////////////////////////////////////////////////////
app.get("/studentCertificate/:Cnum", function(req, res) {
  const userId = req.params.Cnum;
  // Check if the userId is a valid certificate number
  if (!/^[0-9]+$/.test(userId)) {
    return res.send("Invalid certificate number");
  }
  User.findOne({ certificateNumber: userId }, function(err, user) {
    if (err) {
      console.log(err);
      return res.send("Error finding certificate!");
    }
    else if (!user) {
      console.log("User not found for certificate number:", userId);
      return res.send("Certificate not found");
    }
    else {
      // Format the start and end dates in "DD/MM/YYYY" format
      const formattedStartDate = user.startDate.toLocaleDateString("en-US");
      const formattedEndDate = user.endDate.toLocaleDateString("en-US");

      // Render the certificate information
      res.render("verify.ejs", {
        Cnumber: userId,
        Cname: user.name,
        Crole: user.role,
        Corganization: user.organization,
        Corganizer: user.organizer,
        CstartDate: formattedStartDate,
        CendDate: formattedEndDate
      });
    }
  });
});
///////////////////////////////////////////////////////////////////////////////////

app.get("/", function(req, res){
  res.render("createCerti.ejs");
});
///////////////////  lISTEN/////////////////////////////////////////////////////////
app.listen(3000, function(){
    console.log("Server is up and running!");
});