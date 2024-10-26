import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/payment",
            id: "pesapal",
            options: {
              consumerKey: process.env.PESAPAL_CONSUMER_KEY,
              consumerSecret: process.env.PESAPAL_CONSUMER_SECRET,
              ipnId: process.env.PESAPAL_IPN_ID,
              callbackUrl: process.env.PESAPAL_CALLBACK_URL,
              isTest: process.env.NODE_ENV !== "production",
            }
          }
        ]
      }
    }
  ],
})
