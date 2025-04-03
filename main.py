from flask import Flask, render_template, request
from flask_mail import Mail, Message
import random

app = Flask(__name__, static_url_path='')

app.config['MAIL_SERVER'] = 'smtp.yandex.ru'
app.config['MAIL_USERNAME'] = 'ngh2021@yandex.ru'
app.config['MAIL_PASSWORD'] = 'hvmhfmtrnsltnngb'
app.config['MAIL_PORT'] = 465
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = True
mail = Mail(app)


@app.route("/", methods=['POST', 'GET'])
def hi():

    if request.method == 'POST':
        data = request.form.to_dict()
        msg = Message(
            'New Message From Site',
            sender='ngh2021@yandex.ru',
            recipients=['ivan-a-popov@ya.ru']
        )
        msg.body = f"""You've got message from ivanpopov.pro! Here's your data:
                    Name: {data['ajax_name']}
                    E-mail: {data['ajax_email']}
                    Message: {data['ajax_message']}
                    """

        mail.send(msg)
        return ""
    return render_template("index.html", effect=random.choice(['particle', 'ripple', 'glitch']))


if __name__ == "__main__":
    app.run()

