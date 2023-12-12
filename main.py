from flask import Flask, render_template, request
from flask_mail import Mail, Message
import random

app = Flask(__name__, static_url_path='')

app.config['MAIL_SERVER'] = 'smtp.yandex.ru'
app.config['MAIL_USERNAME'] = 'ip@vladivostok.com'
app.config['MAIL_PASSWORD'] = 'dnfqkstwcyupamtr'
app.config['MAIL_PORT'] = 465
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = True
mail = Mail(app)

@app.route("/", methods=['POST', 'GET'])
def hi():
    effect = random.choice(['particle', 'ripple', 'glitch'])
    if request.method == 'POST':
        data = request.form.to_dict()
        msg = Message(
            'Hello',
            sender='ip@vladivostok.com',
            recipients=['ivan-a-popov@ya.ru']
        )
        msg.body = f"""Hello Flask message sent from Flask-Mail! Here's your data:
                    Name: {data['ajax_name']}
                    E-mail: {data['ajax_email']}
                    Message: {data['ajax_message']}
                    Effect: {effect}
                    """

        mail.send(msg)
        print("sent")
        return ""
    return render_template("index.html", effect=effect)


if __name__ == "__main__":
    app.run()

