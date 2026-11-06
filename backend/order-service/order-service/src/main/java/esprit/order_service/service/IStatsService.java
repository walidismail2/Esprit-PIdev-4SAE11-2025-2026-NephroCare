package esprit.order_service.service;
import esprit.order_service.dto.DeliveryStatsResponse;
import esprit.order_service.dto.GlobalStatsResponse;
import esprit.order_service.dto.OrderStatsResponse;

public interface IStatsService {
    OrderStatsResponse    getOrderStats();
    DeliveryStatsResponse getDeliveryStats();
    GlobalStatsResponse   getGlobalStats();
}
