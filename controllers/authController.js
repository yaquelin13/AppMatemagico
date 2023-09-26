const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const conexion = require("../database/db");
const { promisify } = require("util");
const { error } = require("console");

exports.login = async (req, res) => {
    try {
        const user = req.body.usuario
        const pass = req.body.password
        if (!user || !pass) {
            res.render('login', {
                alert: true,
                alertTitle: "Advertencia",
                alertMessage: "Ingrese un usuario y contraseña",
                alertIcon: 'info',
                showConfirmButton: true,
                timer: false,
                ruta: 'login'
            })
        } else {
            conexion.query('SELECT * FROM usuario WHERE nombreUsuario = ?', [user], async (error, results) => {
                if (results.length == 0 || !(await bcryptjs.compare(pass, results[0].contrasena))) {
                    res.render('login', {
                        alert: true,
                        alertTitle: "Error",
                        alertMessage: "Usuario y/o contraseña incorrectas",
                        alertIcon: 'error',
                        showConfirmButton: true,
                        timer: false,
                        ruta: 'login'

                    })
                } else {
                    //Inicio de sesión exitoso
                    const id = results[0].id
                    const token = jwt.sign({ id: id }, process.env.JWT_SECRET, {
                        expiresIn: process.env.JWT_TIME_EXPIRES
                    })
                    console.log("TOKEN: " + token + " para el USUARIO: " + user)
                    const cookiesOptions = {
                        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000),
                        httpOnly: true
                    }
                    res.cookie('jwt', token, cookiesOptions)
                    res.render('login', {
                        alert: true,
                        alertTitle: "Conexión Exitosa",
                        alertMessage: "Login Verificado",
                        alertIcon: 'success',
                        showConfirmButton: false,
                        timer: 800,
                        ruta: 'dashboard'
                    })

                }
            })
        }
        console.log("Usuario: " + user + " Contraseña: " + pass)
    } catch (error) {
        console.log(error)

    }

}

exports.isAuthenticated = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            const decodificada = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET)
            conexion.query('SELECT * FROM usuario WHERE idUsuario = ?', [decodificada.id], (error, results) => {
                if (!results) { return next() }
                req.user = results[0]
                return next()
            })
        } catch (error) {
            console.log(error)
            return next()
        }

    } else {
        res.redirect('/login')
    }
}

exports.logout = (req, res) => {
    res.clearCookie('jwt')
    return res.redirect('/')
}

exports.register = async (req, res) => {
    try {
        const nombre = req.body.nombre;
        const apellidoPaterno = req.body.apellidoPaterno;
        const apellidoMaterno = req.body.apellidoMaterno;
        const correo = req.body.correo;
        const usuario = req.body.usuario;
        const edad = req.body.edad;
        const pass = req.body.pass;
        let passHash = await bcryptjs.hash(pass, 8);

        // Verificar que todos los campos estén completos
        if (!nombre || !apellidoPaterno || !apellidoMaterno || !correo || !usuario || !edad || !pass) {
            return res.render('register', {
                alert: true,
                alertTitle: "Advertencia",
                alertMessage: "Por favor, complete todos los campos",
                alertIcon: 'info',
                showConfirmButton: true,
                timer: false,
                ruta: 'register'
            });
        }

        // Validar que los campos de nombre y apellidos no contengan números ni caracteres especiales
        const nombreRegex = /^[a-zA-ZÀ-ÿ\s]+$/; // Letras mayúsculas y minúsculas, incluyendo acentos y espacios
        if (!nombre.match(nombreRegex)) {
            return res.render('register', {
                alert: true,
                alertTitle: "Advertencia",
                alertMessage: "El campo de nombre contiene caracteres no válidos",
                alertIcon: 'info',
                showConfirmButton: true,
                timer: false,
                ruta: 'register'
            });
        }

        if (!apellidoPaterno.match(nombreRegex) || !apellidoMaterno.match(nombreRegex)) {
            return res.render('register', {
                alert: true,
                alertTitle: "Advertencia",
                alertMessage: "Los campos de apellido contienen caracteres no válidos",
                alertIcon: 'info',
                showConfirmButton: true,
                timer: false,
                ruta: 'register'
            });
        }

        // Inserción en la base de datos 
        conexion.query(
            "INSERT INTO usuario SET ?",
            {
                nombre: nombre,
                apellidoPaterno: apellidoPaterno,
                apellidoMaterno: apellidoMaterno,
                correo: correo,
                nombreUsuario: usuario,
                edad: edad,
                contrasena: passHash
            },
            (error, results) => {
                if (error) {
                    console.log(error);
                }
                res.render('login', {
                    alert: true,
                    alertTitle: "Registro Exitoso",
                    alertMessage: "Su cuenta ha sido registrada correctamente",
                    alertIcon: 'success',
                    showConfirmButton: true,
                    timer: 3000,
                    ruta: 'login'
                });
            }
        );

        // Luego de la inserción exitosa, redirige al usuario a la página de inicio de sesión

    } catch (error) {
        console.log(error);
        res.status(500).send("Error interno del servidor");
    }
};
