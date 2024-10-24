import { defineAuth, secret } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: "CODE",
      verificationEmailSubject: "Welcome to On-Track!",
      verificationEmailBody: (createCode) =>
        `Use this code to confirm your account: ${createCode()}`,
    },
    externalProviders: {
      google: {
        clientId: secret("GOOGLE_CLIENT_ID"),
        clientSecret: secret("GOOGLE_CLIENT_SECRET"),
        scopes: ["email", "profile"],
        attributeMapping: {
          email: "email",
          fullname: "name",
        },
      },
      callbackUrls: [
        "http://localhost:3000/login",
        "https://main.d1x8nvduk93o7e.amplifyapp.com/login",
      ],
      logoutUrls: [
        "http://localhost:3000/login",
        "https://main.d1x8nvduk93o7e.amplifyapp.com//login",
      ],
    },
  },

  multifactor: {
    mode: "OPTIONAL",
    totp: true,
  },

});
