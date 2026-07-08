$src = ".\src"

# Tworzenie folderów
$folders = @(
    "app",
    "hooks",
    "layouts",
    "services",
    "constants",
    "styles",

    "features\authentication\pages",
    "features\dashboard\pages",
    "features\voting\pages",
    "features\resolutions\pages",
    "features\amendments\pages",
    "features\parliamentarians\pages",
    "features\meetings\pages"
)

foreach ($folder in $folders) {
    New-Item -ItemType Directory -Force -Path "$src\$folder" | Out-Null
}


# App
Move-Item "$src\App.jsx" "$src\app\App.jsx"
Move-Item "$src\App.css" "$src\app\App.css"
Move-Item "$src\main.jsx" "$src\app\main.jsx"


# Hooks
Move-Item "$src\useReveal.js" "$src\hooks\useReveal.js"


# Authentication
Move-Item "$src\pages\Login.jsx" "$src\features\authentication\pages\Login.jsx"
Move-Item "$src\pages\Login.css" "$src\features\authentication\pages\Login.css"


# Dashboard
Move-Item "$src\pages\Dashboard.jsx" "$src\features\dashboard\pages\Dashboard.jsx"
Move-Item "$src\pages\Dashboard.css" "$src\features\dashboard\pages\Dashboard.css"


# Voting
Move-Item "$src\pages\VotingPage*" "$src\features\voting\pages"
Move-Item "$src\pages\VotingList*" "$src\features\voting\pages"
Move-Item "$src\pages\CreateVoting*" "$src\features\voting\pages"


# Resolutions
Move-Item "$src\pages\ResolutionDetails*" "$src\features\resolutions\pages"
Move-Item "$src\pages\Resolutions*" "$src\features\resolutions\pages"


# Amendments
Move-Item "$src\pages\AddAmendment*" "$src\features\amendments\pages"
Move-Item "$src\pages\AmendmentDetails*" "$src\features\amendments\pages"
Move-Item "$src\pages\AmendmentsPage*" "$src\features\amendments\pages"


# Parliamentarians
Move-Item "$src\pages\Parliamentarians*" "$src\features\parliamentarians\pages"
Move-Item "$src\pages\Members*" "$src\features\parliamentarians\pages"


# Meetings
Move-Item "$src\pages\SessionDetails*" "$src\features\meetings\pages"
Move-Item "$src\pages\Meetings*" "$src\features\meetings\pages"


Write-Host "Migracja zakonczona!"