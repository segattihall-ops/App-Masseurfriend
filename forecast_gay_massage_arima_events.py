# -------------------------------------------------
#  forecast_gay_massage_arima_events.py
# -------------------------------------------------
import pandas as pd
import numpy as np
from pytrends.request import TrendReq
import pmdarima as pm               # auto‑ARIMA
from prophet import Prophet
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error

# -------------------- 1. KEYWORDS --------------------
keywords = [
    "gay massage","gay massage near me","male massage","male massage therapist near me",
    "gay male massage","gay male massage near me","gay massage therapist near me",
    "gay massage finder","male massage therapist","male-to-male massage","M4M",
    "M4M massage","MasseurFinder","Masseur finder","RentMasseur","Rent masseur",
    "Rentmen","Rent men","gay massage therapist","LGBT massage therapist",
    "LGBTQ affirming massage","Queer massage therapist","deep tissue gay massage",
    "sports massage gay therapist","mobile gay massage","gay massage incall",
    "gay massage outcall","gay-friendly massage","professional gay masseur"
]

# -------------------- 2. GOOGLE TRENDS (histórico) --------------------
pytrend = TrendReq(hl='en-US', tz=360)               # Central Time (UTC‑6)
pytrend.build_payload(
    kw_list=keywords,
    cat=0,
    timeframe='today 12-m',       # últimos 12 meses (aumente se quiser)
    geo='US-TX'                   # foco no Texas; ajuste ou remova conforme necessário
)

df_trends = pytrend.interest_over_time()
df_trends = df_trends.drop(columns=['isPartial'])
# Índice agregado = média das keywords
df_trends['trend_index'] = df_trends[keywords].mean(axis=1)
df_trends = df_trends.reset_index().rename(columns={'date':'ds'})

# -------------------- 3. PREVISÃO DO TREND_INDEX COM VALIDAÇÃO CRUZADA --------------------
y = df_trends['trend_index'].values

tscv = TimeSeriesSplit(n_splits=5,          # número de dobras
                       test_size=12,       # tamanho do teste (ex.: últimos 12 meses)
                       gap=0)              # espaço entre treino e teste (opcional)

mae_scores = []
best_mae = np.inf
best_order = None
best_seasonal_order = None

print("Iniciando validação cruzada do ARIMA...")
for train_idx, test_idx in tscv.split(y):
    y_train, y_test = y[train_idx], y[test_idx]

    # Auto‑ARIMA (pmdarima testa múltiplas combinações de p,d,q e P,D,Q)
    model = pm.auto_arima(
        y_train,
        seasonal=True,
        m=12,               # periodicidade anual se seus dados são mensais
        stepwise=True,
        suppress_warnings=True,
        error_action='ignore',
        trace=False
    )

    # Previsão para o período de teste
    y_pred = model.predict(n_periods=len(y_test))

    # Métrica de erro
    mae = mean_absolute_error(y_test, y_pred)
    mae_scores.append(mae)

    # Guarda o melhor modelo (menor MAE até agora)
    if mae < best_mae:
        best_mae = mae
        best_order = model.order
        best_seasonal_order = model.seasonal_order

print(f"Melhor MAE encontrado: {best_mae}")
print(f"Melhor order: {best_order}, Melhor seasonal_order: {best_seasonal_order}")

# Treinar o modelo final com todos os dados
final_model = pm.ARIMA(order=best_order,
                       seasonal_order=best_seasonal_order)
final_model.fit(y)   # usa toda a série histórica

# Previsão futura (ex.: próximos 30 dias)
periods_future = 30
forecast_arima = final_model.predict(n_periods=periods_future)

# Constrói dataframe com as datas futuras
last_date = df_trends['ds'].iloc[-1]
future_dates = pd.date_range(start=last_date + pd.Timedelta(days=1),
                             periods=periods_future, freq='D')
trend_future = pd.DataFrame({
    'ds': future_dates,
    'trend_index': forecast_arima
})

# -------------------- 4. CARREGAR CALENDÁRIO DE EVENTOS --------------------
events_df = pd.read_csv('events_lgbtq.csv')
events_df['ds'] = pd.to_datetime(events_df['ds'])
events_df['holiday_flag'] = 1
events_agg = events_df[['ds','holiday_flag']].groupby('ds').sum().reset_index()

# -------------------- 5. HISTÓRICO DE DEMANDA --------------------
df_demand = df_trends[['ds','trend_index']].rename(columns={'trend_index':'y'})

# -------------------- 6. MODELO DE DEMANDA (Prophet) --------------------
m_demand = Prophet(
    yearly_seasonality=True,
    weekly_seasonality=True,
    daily_seasonality=False,
    changepoint_prior_scale=0.05
)

m_demand.add_regressor('trend_index')
m_demand.add_regressor('holiday_flag')
m_demand.add_country_holidays(country_name='US')

df_train = df_demand.merge(events_agg[['ds','holiday_flag']], on='ds', how='left')
df_train['holiday_flag'].fillna(0, inplace=True)
m_demand.fit(df_train)

# -------------------- 7. DATAFRAME FUTURO --------------------
future = m_demand.make_future_dataframe(periods=periods_future)
future = future.merge(trend_future, on='ds', how='left')
future['trend_index'].ffill(inplace=True)
future = future.merge(events_agg[['ds','holiday_flag']], on='ds', how='left')
future['holiday_flag'].fillna(0, inplace=True)

# -------------------- 8. FORECAST DE DEMANDA --------------------
forecast = m_demand.predict(future)
print("\nForecast de demanda (índice normalizado 0‑100) para os próximos", periods_future, "dias:\n")
print(forecast[['ds','yhat','yhat_lower','yhat_upper']].tail(periods_future))
forecast[['ds','yhat','yhat_lower','yhat_upper']].to_csv('forecast_gay_massage_arima_events.csv', index=False)
