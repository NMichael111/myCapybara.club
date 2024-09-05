
# MyCapybara.club

## Overview
Capybara Battle Game is a web application where users can register, log in, and manage their own virtual pets (Capybaras). Users can feed, play with, and battle their Capybaras against others in a turn-based battle system. The app supports Google OAuth for user authentication.

## Features
- **User Registration and Login**: Users can create accounts and log in using either a custom username and password or Google OAuth.
- **Pet Management**: Users can choose and name their Capybara, and take care of its needs like feeding and playing.
- **Battle System**: Engage in battles with other users' Capybaras in a turn-based system.
- **Session Management**: User sessions are maintained using `express-session` and integrated with Socket.IO for real-time interactions.

## Technologies Used
- **Backend**: Node.js, Express.js, Socket.IO
- **Database**: MongoDB (Mongoose)
- **Authentication**: Passport.js with Google OAuth2
- **Templating Engine**: Handlebars (HBS)
- **Other**: Axios, bcryptjs, escape-string-regexp

### User Registration and Login
- Visit `/register` to create a new account.
- Visit `/login` to log in with an existing account or via Google OAuth.

### Managing Your Capybara
- After logging in, choose and name your Capybara.
- Visit `/feed` to feed your Capybara.
- Visit `/play` to play with your Capybara.

### Battling
- Challenge another user to a battle via `/challenge`.
- Engage in real-time turn-based battles with other users.

## Contributing
Feel free to submit issues or pull requests to contribute to the development of this project.

## License
This project is licensed under the MIT License.

## Acknowledgments
- [Socket.IO](https://socket.io/)
- [Passport.js](http://www.passportjs.org/)
- [Mongoose](https://mongoosejs.com/)
- [Axios](https://axios-http.com/)
- [capybara](https://capy.lol)