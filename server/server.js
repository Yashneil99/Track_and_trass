const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io")
const cors = require("cors");
const { logger } = require("./src/utils/logger.js");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const usersRoutes = require("./src/routes/usersRoutes.js");
const movementRoutes = require("./src/routes/movementsRoutes.js");
const materialRoutes = require("./src/routes/materialsRoutes.js");
const locationRoutes = require("./src/routes/locationsRoutes.js");
const processRoutes = require("./src/routes/processRoutes.js");
const stnRoutes = require("./src/routes/stnRoutes.js");
const raiseRequestRoutes = require("./src/routes/raiseRequestRoutes.js");
const updateUserSchema = require("./src/middlewares/updateUserSchema.js");
const { csrfProtection, generateCsrfToken } = require("./src/middlewares/csrf");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100000,
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30000,
  standardHeaders: true,
  legacyHeaders: false,
});

const httpServer = http.createServer(app); // Wrap Express with HTTP
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] } // Allow cross-origin for intranet
});

const PORT = process.env.PORT || 5001;

const path = require("path");
dotenv.config({ path: path.join(__dirname, ".env") });

// Public origin the browser uses to reach this server (set per-machine via env).
const SERVER_ORIGIN = `http://${process.env.SERVER_HOST || "localhost"}:${PORT}`;

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    return callback(null, true);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
        fontSrc: ["'self'", "fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "cdn.jsdelivr.net"],
        connectSrc: ["'self'", SERVER_ORIGIN],
        frameSrc: ["'self'", "accounts.google.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    frameguard: { action: "deny" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    xssFilter: true,
    noSniff: true,
    hidePoweredBy: true,
    ieNoOpen: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    expectCt: {
      maxAge: 86400,
      enforce: true,
      reportUri: `${SERVER_ORIGIN}/report-ct`,
    },
    featurePolicy: {
      features: {
        fullscreen: ["'self'"],
        vibrate: ["'none'"],
        payment: ["'none'"],
        syncXhr: ["'none'"],
        geolocation: ["'self'"],
        microphone: ["'none'"],
        camera: ["'none'"],
        magnetometer: ["'none'"],
        gyroscope: ["'none'"],
        speaker: ["'none'"],
        ambientLightSensor: ["'none'"],
        accelerometer: ["'none'"],
      },
    },
  }),
);

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/uploads", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});
app.use("/uploads", express.static("uploads"));
app.get("/api/csrf-token", csrfProtection, generateCsrfToken);
app.use((req, res, next) => {
  console.log(req.ip, "ip");
  const requestId = require("crypto").randomBytes(16).toString("hex");
  req.requestId = requestId;
  res.set("X-Request-ID", requestId);
  next();
});
app.use("/api", authLimiter, usersRoutes);
app.use("/api/materials", apiLimiter, materialRoutes);
app.use("/api/movement", apiLimiter, movementRoutes);
app.use("/api/process", apiLimiter, csrfProtection, processRoutes);
app.use("/api/location", apiLimiter, locationRoutes);
app.use("/api/stn", apiLimiter, stnRoutes);
app.use("/api/raise", apiLimiter, raiseRequestRoutes(io));

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

updateUserSchema()
  .then(() => {
    console.log("User schema update completed successfully");
  })
  .catch((error) => {
    console.error("Failed to update user schema:", error);
  });
