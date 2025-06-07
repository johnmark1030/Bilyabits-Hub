# Bilyabits-Hub
![bilyabits-hub](./img/bilyabit-hub.jpeg)

## Table of Contents
- [Update Log](#update-log)
- [Introduction](#introduction)
- [Credits](#credits)
- [How to Set It Up](#how-to-set-it-up)
  - [Clone the Repository](#clone-the-repositoryfor-developmental-use-only)
  - [Config.json Settings](#configjson-settings)
  - [Root Directory](#root-directory)
  - [Install Dependencies](#install-dependencies)
  - [Run the project/Build Command](#run-the-projectbuild-command)
- [Contacts](#contacts)

## Update Log 
### as of (01/13/2025)
- **Fixed issues with the Facebook API connection and improved error handling in `runApp.js`.**
- **Added a new feature when the bot is successfully online, the admin will get a notification from the bot as shown in the example:**
![logo](./img/Screenshot_20250113-171034_1.png)
- **Added an auto change bio for bot. You can change the bio string in the `runApp.js` file.**

## Introduction
Bilyabits-Hub is a facebook chat bot automated with various commands to help you access the bot freely that uses a fca api called **WS3-FCA.**


## Credits
`WS3-FCA:`  [Click here](https://www.npmjs.com/package/ws3-fca)

## How to Set It Up
1. **Clone the Repository(For developmental use only):**
   ```
   git clone https://github.com/carljohnvillavito/Bilyabits-Hub.git
   cd Bilyabits-Hub
   ```

2. **Configuration Settings:**
   Setup your account, prefix, and port on `config.json` also paste ur cookie header string in `appstate.txt`

3. **Root Directory:**
   ```
   ./
   ```

4. **Install Dependencies:**
   ```
   npm install
   ```
5. **Run the project/Build Commannd:**
   ```
   node runApp.js
   ```

## Contacts
For any questions or support, feel free to reach out:
- **Facebook:** https://facebook.com/carljohn.villavito
- **Email:** carljohnvillavito2023@gmail.com
- **GitHub Issues:** [Submit an issue](https://github.com/carljohnvillavito/autobot-test/issues)
