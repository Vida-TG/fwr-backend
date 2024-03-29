const pool = require("../connections/pool")
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const { sendVerificationCode } = require('../verify')
const { createNotification } = require('../utils')

const register = async (req, res) => {
    let payload = req.body;
    const hashedPassword = await bcrypt.hash(payload.password, 10);
    //Check if mail has previously been registered
    const checkEmailQuery = `SELECT COUNT(*) AS count FROM users WHERE email = ?`
    pool.query(checkEmailQuery, [payload.email], async (err, result) => {
        if (result && result.length > 0) {
            const emailExists = result[0].count > 0;
            if (emailExists) {            
                return res.status(200).json({ status: false, message: 'This mail has previously been registered' });
            }else {
                const values = [payload.email, hashedPassword, payload.phonenum]
                const sql = `INSERT INTO users (email, password, phonenum) VALUES(?, ?, ?)`
                pool.query(sql, values, (err, result) => {
                    if (!err) {
                        const getUserSql = `SELECT * FROM users WHERE email = ?`;
                        pool.query(getUserSql, [payload.email], async (err, result) => {
                            if (!err) createNotification("signup", result[0].id, result[0]);
                        });
                        // sendVerificationCode(res, payload)
                        res.status(200).json({status: true, message: 'Success', token: accessToken({id:result.insertId})})
                    } else {
                        console.log(err)
                        res.status(500).json({message: 'Internal Server Error'})
                    }
                })
            }
        }
    })    
}


const login = (req, res) => {
    let payload = req.body
    const values = [payload.email]
    const checkEmail = `SELECT * FROM users WHERE email = ?`
    pool.query(checkEmail, values, async (err, result)=>{
        const user = result
        if (err) {
            return res.status(500).json({message: 'Internal Server Error'})
        }else {
            if (user.length == 0) {
                return res.status(200).json({status: false, message: 'User not found'})
            }else {
                if (await bcrypt.compare(payload.password, user[0].password)) {
                    // if (user.is_phone_verified == 1) {
                        const token = accessToken(user[0])
                        res.status(200).json({status: true, token, verify: true})
                    // } else {                        
                    //     sendVerificationCode(res, user[0]);
                    // }
                } else {
                    return res.status(200).json({status: false, message: 'Incorrect Password'})
                }
            }
        }        
    })
}
const accessToken = (user)=>{
    return jwt.sign({ result: user }, process.env.JWT_SECRET, { expiresIn: '60m' })    
}
const currentUser = (req, res)=>{
    res.status(200).json({loggedInUser: req.user[0]})
}

module.exports = { register, login, currentUser, accessToken }