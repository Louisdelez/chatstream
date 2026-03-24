# ChatStream

Lecteur de chat Twitch en temps reel avec affichage style document (A4 / Google Docs). Lisez, annotez, surlignez et exportez n'importe quel chat Twitch.

![ChatStream Light Mode](docs/screenshot-light.png)

![ChatStream Dark Mode](docs/screenshot-dark.png)

## Fonctionnalites

### Chat en temps reel
- Connexion a **n'importe quel chat Twitch** (anonyme ou authentifie)
- Chargement des **messages precedents** au demarrage
- Affichage des **emotes Twitch** en images
- **Liens cliquables** (ouverts dans un nouvel onglet)
- **@mentions** colorees avec la couleur du pseudo mentionne
- **Statut live/hors ligne** avec nombre de viewers et categorie

### Affichage style document
- Presentation en **colonnes** : heure, plateforme, role, pseudo, message
- Texte **justifie** comme sur Word/Google Docs
- Mode **page A4** ou **pleine largeur**
- **10 polices** au choix (Inter, Roboto, Montserrat, Merriweather...)
- **Taille de police** ajustable (8-36px)
- **Dark mode** / Light mode

### Mise en forme (style Word)
- **Surlignage** avec 7 couleurs
- **Gras**, **Italique**, **Souligne**, **Barre**
- **Toggle** : selectionner du texte, cliquer sur le style, re-cliquer pour enlever
- La selection reste apres application d'un style

### Epinglage
- Epingler un message ou une selection de texte
- Panneau lateral avec tous les epingles
- Clic pour revenir au message original dans le chat

### Filtrage
- Par **role** (streamer, moderateur, VIP, abonne)
- Par **mot-cle**
- Par **type d'evenement** (subs, bits, raids, prime, dons de sub)
- **Masquage** de l'hote et des bots connus (Nightbot, StreamElements, Moobot...)

### Evenements Twitch
- **Abonnements** (sub, resub, prime)
- **Dons de sub** (gift subs) consolides en un seul message
- **Bits** avec message
- **Raids** avec nombre de viewers
- Chaque type activable/desactivable

### Archives
- Messages **stockes automatiquement** jour par jour
- Navigation par jour avec **blocs de 1000 messages**
- Possibilite de **rouvrir des archives** dans la vue principale
- Conservation des mises en forme dans les archives

### Export
- **PDF** (fidele au rendu document)
- **Texte brut**
- **JSON** structure

### Multi-channels
- Barre laterale avec liste des chaines
- Navigation rapide entre les chats
- Ajout/suppression de chaines

### Comptes utilisateur
- Inscription par **email + mot de passe** ou **Google OAuth**
- Liaison de compte **Twitch** pour envoyer des messages
- **Synchronisation** des settings, pins, formats, channels vers le serveur
- **Migration** des donnees locales vers le serveur

### Partage
- Creer un **lien de partage** pour un chat
- 4 niveaux de permission : lecture, mise en forme, epingles, complet
- Page publique accessible sans compte

### Responsive
- PC, tablette, smartphone
- Sidebar et panneau d'epingles en overlay sur mobile

## Stack technique

| Couche | Technologie |
|--------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, TailwindCSS 4, Radix UI, Lucide Icons |
| State | Zustand (avec sync serveur) |
| Twitch IRC | tmi.js |
| Base de donnees | PostgreSQL + Prisma 6 |
| Auth | better-auth (email/password + Google OAuth) |
| Stockage local | IndexedDB (cache offline) |
| Export PDF | html2pdf.js |

## Installation

### Prerequis
- Node.js 18+
- PostgreSQL (ou Docker)
- npm

### 1. Cloner le repo

```bash
git clone https://github.com/Louisdelez/chatstream.git
cd chatstream
```

### 2. Installer les dependances

```bash
npm install
```

### 3. Configurer l'environnement

Creer un fichier `.env` a la racine :

```env
# Base de donnees PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/chatstream"

# Better Auth
BETTER_AUTH_SECRET="votre-secret-aleatoire"
BETTER_AUTH_URL="http://localhost:3000"

# Google OAuth (optionnel)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Twitch (optionnel, pour l'envoi de messages)
NEXT_PUBLIC_TWITCH_CLIENT_ID=""
TWITCH_CLIENT_SECRET=""
```

### 4. Lancer PostgreSQL

```bash
# Avec Docker
docker run -d --name chatstream-postgres \
  -e POSTGRES_USER=chatstream \
  -e POSTGRES_PASSWORD=chatstream \
  -e POSTGRES_DB=chatstream \
  -p 5432:5432 \
  postgres:17-alpine
```

### 5. Appliquer les migrations

```bash
npx prisma migrate dev
```

### 6. Lancer le serveur

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Utilisation

1. Entrer un nom de chaine Twitch sur la page d'accueil
2. Le chat s'affiche en temps reel dans un format document
3. Utiliser la barre d'outils pour :
   - Surligner et mettre en forme du texte
   - Filtrer par role ou mot-cle
   - Epingler des messages importants
   - Changer la police et la taille
   - Exporter en PDF/texte/JSON
4. Creer un compte pour sauvegarder et partager

## Structure du projet

```
src/
  app/
    api/            # 23 API routes (auth, messages, formats, pins, shares...)
    chat/[channel]/ # Page principale du chat
    login/          # Page de connexion
    register/       # Page d'inscription
    share/[slug]/   # Page de partage publique
  components/
    chat/           # ChatDocument, ChatMessage, ChatToolbar, BottomBar...
    auth/           # UserMenu
    export/         # ExportMenu
  hooks/            # useTwitchChat, useAutoScroll, useStreamStatus
  stores/           # Zustand stores (auth, chat, settings, pins, mute...)
  lib/              # Prisma, auth, Twitch IRC, export, formatters, DB
  types/            # TypeScript types
prisma/
  schema.prisma     # 12 modeles (User, Message, Format, Pin, Share...)
```

## Licence

[MIT](LICENSE)
