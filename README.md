# steps to run server

- run "npm start" in root folder
- open another terminal and run "ngrok http 8000"
- copy the 1st part of "Forwarding" url. It usually looks like "https://ip.ngrok-free.app". Use this as Base url in the app.

# view DB

- Open Mongo DB compass
- create a new connection or open an existing connection
- Connection url can be found in this doc
  https://docs.google.com/document/d/1sh2dh36AGnYvyzjJv4VeTbBsc1DR3r0xfGhGC_51q6o/edit?usp=sharing
- after successfully connecting to DB, open "production" DB. This will show all tables used by the app.
