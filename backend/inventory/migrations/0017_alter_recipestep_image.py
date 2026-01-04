from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0016_alter_inventory_created_at'),
    ]

    operations = [
        migrations.AlterField(
            model_name='recipestep',
            name='image',
            field=models.URLField(blank=True, max_length=500, null=True),
        ),
    ]

