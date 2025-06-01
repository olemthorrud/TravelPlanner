Travel Planner App – Setup Guide

Step 1: Setup Virtual Environment

Create a new folder to house your virtual environment.

Open your favourite code editor and create a virtual environment. Activate it:

python3 -m venv venv
source venv/bin/activate 

Step 2: Clone Repository

Install git if necessary. Then, clone into the repo (skipped for now—we’ll see which branch ends up being the final one).

After cloning, navigate to the root folder:

cd SE4A_KienNinhDo_JulieRonesenLandaas_OleMandiusHarmThorrud

Step 3: Install Dependencies

Install the required packages:

pip install -r requirements.txt

Step 4: Setup Environment Variables

Create a .env file in the root directory with the following contents:

SECRET_KEY='django-insecure-@xxum1*m@4c)rzux6qgn3r70)$7ry1^$_a-l+c=7ftc*hlxt-^'
TICKETMASTER_API_KEY=B3pcAtorOZdM5qHffd2Ogd8N5TUSsLat
OPENAI_API_KEY=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
WEATHER_API_KEY=e10b7018498e647fd5c84fac60bd9a11

Step 5: Start the Django Backend

Run migrations and start the server:

python manage.py makemigrations KJObackend
python manage.py migrate
python manage.py runserver

Step 6: Create Test Users

Open a new terminal, navigate to the project folder, and enter Django’s shell:

cd SE4A_KienNinhDo_JulieRonesenLandaas_OleMandiusHarmThorrud
python manage.py shell

Then paste and run:

from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

names = ["Marco", "Giulia", "Luca", "Sofia", "Andrea"]

for name in names:
    username = name.lower()
    password = f"{username}polimi"
    
    user, created = User.objects.get_or_create(username=username)
    if created:
        user.set_password(password)
        user.first_name = name
        user.save()
    
    # Ensure token is created
    Token.objects.get_or_create(user=user)

You may need to press Enter twice.

To view tokens for manual testing, run:

for token in Token.objects.select_related('user').all():
    print(f"{token.user.username}: {token.key}")

Type quit and press Enter to exit the shell.

Step 7: Start Frontend

Navigate to the frontend directory and start the React app:

cd travel-planner-app
npm install
npm start

Happy Testing!

⸻

Additional Notes:

If you want to see what’s happening in the database, you can run commands like:

curl -H "Authorization: Token giuliasToken" \
http://localhost:8000/api/trips/ | jq 

This displays Giulia’s trips and all their associated information.