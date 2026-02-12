# Configuration Endpoints

Base URL: `/bck/cf`

All endpoints require `Authorization: Bearer <accessToken>`.

## 1) List configurations
- Method: `GET`
- Path: `/ls`
- Query (optional): `typ_code`, `conf_code`, `conf_description`, `conf_value`

Example:
`GET /bck/cf/ls?typ_code=FARM&conf_code=WATER_QUALITY`

## 2) Filter configurations (via body)
- Method: `POST`
- Path: `/fl`

Request body example:
```json
{
  "typ_code": "FARM",
  "conf_code": "WATER_QUALITY"
}
```

## 3) Create configuration
- Method: `POST`
- Path: `/cr`

Request body:
```json
{
  "typ_code": "FARM",
  "conf_code": "WATER_QUALITY",
  "conf_description": "Water quality profile",
  "conf_value": "PH:7.0",
  "options": ["PH", "TEMP", "SALINITY"]
}
```

## 4) Update configuration
- Method: `PUT`
- Path: `/up/:id`

Note:
- `typ_code` and `conf_code` cannot be changed.

Request body example:
```json
{
  "conf_description": "Water quality profile v2",
  "conf_value": "PH:7.2",
  "options": ["PH", "TEMP", "SALINITY", "DO"]
}
```

## 5) Get active types
- Method: `GET`
- Path: `/tp`

## Response format
Success:
```json
{
  "result": true,
  "message": "Configurations loaded",
  "data": []
}
```

Error:
```json
{
  "result": false,
  "code": "E_CFG_NOT_FOUND",
  "message": "Configuration not found",
  "data": null
}
```
