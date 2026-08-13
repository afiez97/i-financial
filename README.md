# afiezfinancial (i-financial)

Papan pemuka kewangan peribadi — backend API Laravel + frontend statik vanilla JS/CSS (tiada build step, tiada framework frontend). Dibina untuk kegunaan sendiri (single-user).

## Ciri-ciri

- **Ringkasan (Overview)** — pandangan holistik: baki bersih, jumlah hutang, kekayaan bersih, DTI, tabung kecemasan, cadangan (insights), nasihat AI (Gemini)
- **Aliran Tunai Bulanan** — rekod pendapatan/perbelanjaan ikut kategori, transaksi berulang, had perbelanjaan (budget) per kategori
- **Penjejak Hutang & DTI** — nisbah debt-to-income dengan meter kesihatan kewangan
- **Kalkulator Kad UOB ONE** — enjin faedah dua fasa, penalti lewat bayar, unjuran waiver yuran tahunan
- **Aset & Kekayaan Bersih** — jejak simpanan/ASB/saham/hartanah
- **Tabung Kecemasan** dan **Matlamat Kewangan**

## Stack Teknikal

- **Backend:** Laravel 12, PHP 8.3+, Sanctum (session auth), Pest (testing)
- **Frontend:** Vanilla JS (ES modules) + CSS dilayan terus dari `public/` — tiada npm/Vite/build step
- **DB:** PostgreSQL (production — lihat Setup Production), SQLite in-memory (testing — lihat `phpunit.xml`)

## Setup Pembangunan Tempatan

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

Buka `http://localhost:8000`.

## Ujian

```bash
composer test          # Pest — semua test Feature
vendor/bin/pint --test # semak gaya kod (tanpa ubah fail)
vendor/bin/pint        # auto-fix gaya kod
```

---

## Setup Production (VPS)

Bahagian ni untuk **setup pertama kali** sahaja di server production. Selepas setup awal siap, kemaskini seterusnya (push ke `main`) akan **automatik** dijalankan oleh CI/CD (lihat bahagian bawah) — tak perlu ulang langkah manual ni lagi.

### Keperluan di VPS

- PHP 8.4+ dengan extension: `mbstring`, `dom`, `fileinfo`, `bcmath`, `pdo_pgsql`, `sqlite3` (untuk sesi tempatan jika perlu)
- Composer
- PostgreSQL
- Nginx
- Git
- Node **tidak diperlukan** — frontend tiada build step

### 1. Clone repo

```bash
cd /var/www
git clone https://github.com/afiez97/i-financial.git
cd i-financial
```

### 2. Pasang dependencies

```bash
composer install --no-dev --optimize-autoloader
```

### 3. Cipta Database PostgreSQL

Log masuk sebagai user `postgres`:

```bash
sudo -u postgres psql
```

Di dalam prompt `psql`, cipta user + database khusus untuk app ni:

```sql
CREATE USER afiezfinancial WITH ENCRYPTED PASSWORD 'GANTI_DENGAN_PASSWORD_KUAT';
CREATE DATABASE afiezfinancial OWNER afiezfinancial;
\c afiezfinancial
GRANT ALL ON SCHEMA public TO afiezfinancial;
\q
```

(`GRANT ALL ON SCHEMA public` perlu untuk PostgreSQL 15+ — tanpa ni migration akan gagal dengan ralat "permission denied for schema public".)

Simpan nama database, username, dan password ni — akan digunakan dalam `.env` di langkah seterusnya (`DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`).

> Kalau PostgreSQL dah sedia dipasang & database khusus dah wujud (cth. dikongsi dengan app lain), langkah ni boleh dilangkau — terus ke langkah 4.

### 4. Konfigurasi `.env`

`.env` **tidak** datang dari git (sengaja — ia mengandungi rahsia production). Cipta secara manual:

```bash
cp .env.example .env
php artisan key:generate
```

Edit `.env` dan isikan nilai sebenar untuk production:

```
APP_ENV=production
APP_DEBUG=false
APP_URL=https://domain-anda.com

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=afiezfinancial
DB_USERNAME=afiezfinancial
DB_PASSWORD=...

SESSION_DRIVER=database

GEMINI_API_KEY=...          # untuk ciri Nasihat AI (pilihan — app tetap jalan tanpa ini)
GEMINI_MODEL=gemini-2.5-flash

MAIL_MAILER=...             # untuk emel forgot-password betul-betul dihantar
```

### 5. Migration & storage

```bash
php artisan migrate --force
php artisan storage:link
chown -R www-data:www-data storage bootstrap/cache  # tukar www-data kepada user PHP-FPM anda jika berbeza
chmod -R 775 storage bootstrap/cache
```

### 6. Cache production

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 7. Konfigurasi Nginx

Document root **mesti** ke `public/`, bukan root repo:

```nginx
server {
    listen 80;
    server_name domain-anda.com;
    root /var/www/i-financial/public;

    index index.php;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.4-fpm.sock; # sahkan path socket ni betul: `systemctl status php8.4-fpm`
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Aktifkan & reload:

```bash
ln -s /etc/nginx/sites-available/i-financial /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 8. SSL (disyorkan)

```bash
certbot --nginx -d domain-anda.com
```

Setup pertama kali **selesai**. App sepatutnya boleh diakses sekarang.

---

## CI/CD (kemaskini seterusnya — automatik)

Selepas setup awal di atas siap, setiap `git push` ke `main` akan automatik:

1. **Test** — jalan Pest + semak Pint (`.github/workflows/ci-cd.yml`)
2. **Deploy** — jika test lulus, SSH ke server, `git pull`, `composer install`, `migrate --force`, cache config/route/view, reload PHP-FPM

### Secret yang diperlukan di GitHub (Settings → Secrets and variables → Actions)

| Secret | Nilai |
|---|---|
| `SSH_HOST` | IP/domain VPS |
| `SSH_USER` | `root` (atau user deploy) |
| `SSH_PRIVATE_KEY` | Private key SSH khusus untuk deploy (bukan key peribadi) |

### Deploy manual (fallback, jika CI/CD tak boleh jalan)

```bash
cd /var/www/i-financial
php artisan down
git pull origin main
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache && php artisan route:cache && php artisan view:cache
systemctl reload php8.4-fpm
php artisan up
```

### Rollback

```bash
cd /var/www/i-financial
php artisan down
git log --oneline -5        # cari commit hash sebelum masalah
git reset --hard <commit-hash>
composer install --no-dev --optimize-autoloader
php artisan migrate --force  # jika migration baru perlu di-rollback, guna `migrate:rollback` dahulu
php artisan config:cache && php artisan route:cache && php artisan view:cache
systemctl reload php8.4-fpm
php artisan up
```
