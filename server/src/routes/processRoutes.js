const express = require("express");
const router = express.Router();

const {addProcess}=require("../controllers/processController");
const {fetchAllProcess}=require("../controllers/processController");
const {updateProcess}=require("../controllers/processController");

const verifyToken = require('../middlewares/verifyToken');

router.post('/addNewProcess',verifyToken,addProcess);
router.get('/fetchAllProcess',verifyToken,fetchAllProcess);
router.post('/updateProcess',verifyToken,updateProcess);

module.exports=router;

